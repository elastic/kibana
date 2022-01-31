/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { transformError } from '@kbn/securitysolution-es-utils';
import { Logger } from 'src/core/server';

import { RuleAlertType as Rule } from '../../rules/types';

import type { RulesClient } from '../../../../../../alerting/server';

import {
  DETECTION_ENGINE_RULES_BULK_ACTION,
  MAX_RULES_TO_UPDATE_IN_PARALLEL,
  RULES_TABLE_MAX_PAGE_SIZE,
} from '../../../../../common/constants';
import { BulkAction } from '../../../../../common/detection_engine/schemas/common/schemas';
import { performBulkActionSchema } from '../../../../../common/detection_engine/schemas/request/perform_bulk_action_schema';
import { SetupPlugins } from '../../../../plugin';
import type { SecuritySolutionPluginRouter } from '../../../../types';
import { buildRouteValidation } from '../../../../utils/build_validation/route_validation';
import { routeLimitedConcurrencyTag } from '../../../../utils/route_limited_concurrency_tag';
import { initPromisePool } from '../../../../utils/promise_pool';
import { isElasticRule } from '../../../../usage/detections';
import { buildMlAuthz } from '../../../machine_learning/authz';
import { throwHttpError } from '../../../machine_learning/validation';
import { deleteRules } from '../../rules/delete_rules';
import { duplicateRule } from '../../rules/duplicate_rule';
import { enableRule } from '../../rules/enable_rule';
import { findRules } from '../../rules/find_rules';
import { readRules } from '../../rules/read_rules';
import { patchRules } from '../../rules/patch_rules';
import { appplyBulkActionEditToRule } from '../../rules/bulk_action_edit';
import { getExportByObjectIds } from '../../rules/get_export_by_object_ids';
import { buildSiemResponse } from '../utils';

const MAX_RULES_TO_PROCESS_TOTAL = 10000;
const MAX_ERROR_MESSAGE_LENGTH = 1000;
const MAX_ROUTE_CONCURRENCY = 5;

type RuleActionFn = (rule: Rule) => Promise<void>;

type RuleActionSuccess = undefined;

type RuleActionResult = RuleActionSuccess | RuleActionError;

interface RuleActionError {
  error: {
    message: string;
    statusCode: number;
  };
  rule: {
    id: string;
    name: string;
  };
}

interface NormalizedRuleError {
  message: string;
  status_code: number;
  rules: Array<{
    id: string;
    name: string;
  }>;
}

const normalizeErrorResponse = (errors: RuleActionError[]): NormalizedRuleError[] => {
  const errorsMap = new Map();

  errors.forEach((ruleError) => {
    const { message } = ruleError.error;
    if (errorsMap.has(message)) {
      errorsMap.get(message).rules.push(ruleError.rule);
    } else {
      const { error, rule } = ruleError;
      errorsMap.set(message, {
        message: error.message,
        status_code: error.statusCode,
        rules: [rule],
      });
    }
  });

  return Array.from(errorsMap, ([_, normalizedError]) => normalizedError);
};

const getErrorResponseBody = (errors: RuleActionError[], rulesCount: number) => {
  const errorsCount = errors.length;
  return {
    message: errorsCount === rulesCount ? 'Bulk edit failed' : 'Bulk edit partially failed',
    status_code: 500,
    attributes: {
      errors: normalizeErrorResponse(errors).map(({ message, ...error }) => ({
        ...error,
        message:
          message.length > MAX_ERROR_MESSAGE_LENGTH
            ? `${message.slice(0, MAX_ERROR_MESSAGE_LENGTH - 3)}...`
            : message,
      })),
      rules: {
        total: rulesCount,
        failed: errorsCount,
        succeeded: rulesCount - errorsCount,
      },
    },
  };
};

const executeActionAndHandleErrors = async (
  rule: Rule,
  action: RuleActionFn
): Promise<RuleActionResult> => {
  try {
    await action(rule);
  } catch (err) {
    const { message, statusCode } = transformError(err);
    return {
      error: { message, statusCode },
      rule: { id: rule.id, name: rule.name },
    };
  }
};

const executeBulkAction = async (rules: Rule[], action: RuleActionFn, abortSignal: AbortSignal) =>
  initPromisePool({
    concurrency: MAX_RULES_TO_UPDATE_IN_PARALLEL,
    items: rules,
    executor: async (rule) => executeActionAndHandleErrors(rule, action),
    abortSignal,
  });

const getRulesByIds = async ({
  ids,
  rulesClient,
  isRuleRegistryEnabled,
  abortSignal,
}: {
  ids: string[];
  rulesClient: RulesClient;
  isRuleRegistryEnabled: boolean;
  abortSignal: AbortSignal;
}) => {
  const readRulesExecutor = async (id: string) => {
    try {
      const rule = await readRules({ id, rulesClient, isRuleRegistryEnabled, ruleId: undefined });
      if (rule == null) {
        throw Error('Can`t fetch a rule');
      }
      return { rule };
    } catch (err) {
      const { message, statusCode } = transformError(err);
      return {
        error: { message, statusCode },
        rule: { id },
      };
    }
  };

  const { results } = await initPromisePool({
    concurrency: MAX_RULES_TO_UPDATE_IN_PARALLEL,
    items: ids,
    executor: readRulesExecutor,
    abortSignal,
  });

  return {
    total: ids.length,
    rules: results.filter((rule) => rule.error === undefined).map(({ rule }) => rule) as Rule[],
    fetchErrors: results.filter((rule): rule is RuleActionError => rule.error !== undefined),
  };
};

const fetchRules = async ({
  query,
  ids,
  rulesClient,
  isRuleRegistryEnabled,
  abortSignal,
}: {
  query: string | undefined;
  ids: string[] | undefined;
  rulesClient: RulesClient;
  isRuleRegistryEnabled: boolean;
  abortSignal: AbortSignal;
}) => {
  if (ids) {
    return getRulesByIds({
      ids,
      rulesClient,
      isRuleRegistryEnabled,
      abortSignal,
    });
  }

  const { data, total } = await findRules({
    isRuleRegistryEnabled,
    rulesClient,
    perPage: MAX_RULES_TO_PROCESS_TOTAL,
    filter: query !== '' ? query : undefined,
    page: undefined,
    sortField: undefined,
    sortOrder: undefined,
    fields: undefined,
  });

  return {
    rules: data,
    total,
    fetchErrors: [] as RuleActionError[],
  };
};

export const performBulkActionRoute = (
  router: SecuritySolutionPluginRouter,
  ml: SetupPlugins['ml'],
  logger: Logger,
  isRuleRegistryEnabled: boolean
) => {
  router.post(
    {
      path: DETECTION_ENGINE_RULES_BULK_ACTION,
      validate: {
        body: buildRouteValidation<typeof performBulkActionSchema>(performBulkActionSchema),
      },
      options: {
        tags: ['access:securitySolution', routeLimitedConcurrencyTag(MAX_ROUTE_CONCURRENCY)],
        timeout: {
          idleSocket: moment.duration(15, 'minutes').asMilliseconds(),
        },
      },
    },
    async (context, request, response) => {
      const { body } = request;
      const siemResponse = buildSiemResponse(response);

      if (body?.ids && body.ids.length > RULES_TABLE_MAX_PAGE_SIZE) {
        return siemResponse.error({
          body: `More than ${RULES_TABLE_MAX_PAGE_SIZE} ids sent for bulk edit action.`,
          statusCode: 400,
        });
      }

      if (body?.ids && body.query !== undefined) {
        return siemResponse.error({
          body: `Both query and ids are sent. Define either ids or query in request payload.`,
          statusCode: 400,
        });
      }

      const abortController = new AbortController();

      // subscribing to completed$, because it handles both cases when request was completed and aborted.
      // when route is finished by timeout, aborted$ is not getting fired
      request.events.completed$.subscribe(() => abortController.abort());

      try {
        const rulesClient = context.alerting.getRulesClient();
        const ruleExecutionLogClient = context.securitySolution.getExecutionLogClient();
        const exceptionsClient = context.lists?.getExceptionListClient();
        const savedObjectsClient = context.core.savedObjects.client;

        const mlAuthz = buildMlAuthz({
          license: context.licensing.license,
          ml,
          request,
          savedObjectsClient,
        });

        const { rules, total, fetchErrors } = await fetchRules({
          isRuleRegistryEnabled,
          rulesClient,
          query: body.query,
          ids: body.ids,
          abortSignal: abortController.signal,
        });

        if (total > MAX_RULES_TO_PROCESS_TOTAL) {
          return siemResponse.error({
            body: `More than ${MAX_RULES_TO_PROCESS_TOTAL} rules matched the filter query. Try to narrow it down.`,
            statusCode: 400,
          });
        }

        let processingResponse: {
          results: RuleActionResult[];
        } = {
          results: [],
        };
        switch (body.action) {
          case BulkAction.enable:
            processingResponse = await executeBulkAction(
              rules,
              async (rule) => {
                if (!rule.enabled) {
                  throwHttpError(await mlAuthz.validateRuleType(rule.params.type));
                  await enableRule({
                    rule,
                    rulesClient,
                  });
                }
              },
              abortController.signal
            );
            break;
          case BulkAction.disable:
            processingResponse = await executeBulkAction(
              rules,
              async (rule) => {
                if (rule.enabled) {
                  throwHttpError(await mlAuthz.validateRuleType(rule.params.type));
                  await rulesClient.disable({ id: rule.id });
                }
              },
              abortController.signal
            );
            break;
          case BulkAction.delete:
            processingResponse = await executeBulkAction(
              rules,
              async (rule) => {
                await deleteRules({
                  ruleId: rule.id,
                  rulesClient,
                  ruleExecutionLogClient,
                });
              },
              abortController.signal
            );
            break;
          case BulkAction.duplicate:
            processingResponse = await executeBulkAction(
              rules,
              async (rule) => {
                throwHttpError(await mlAuthz.validateRuleType(rule.params.type));

                await rulesClient.create({
                  data: duplicateRule(rule, isRuleRegistryEnabled),
                });
              },
              abortController.signal
            );
            break;
          case BulkAction.export:
            const exported = await getExportByObjectIds(
              rulesClient,
              exceptionsClient,
              savedObjectsClient,
              rules.map(({ params }) => ({ rule_id: params.ruleId })),
              logger,
              isRuleRegistryEnabled
            );

            const responseBody = `${exported.rulesNdjson}${exported.exceptionLists}${exported.exportDetails}`;

            return response.ok({
              headers: {
                'Content-Disposition': `attachment; filename="rules_export.ndjson"`,
                'Content-Type': 'application/ndjson',
              },
              body: responseBody,
            });
          case BulkAction.edit:
            processingResponse = await executeBulkAction(
              rules,
              async (rule) => {
                throwHttpError({
                  valid: !isElasticRule(rule.tags),
                  message: 'Elastic rule can`t be edited',
                });

                throwHttpError(await mlAuthz.validateRuleType(rule.params.type));

                const editedRule = body[BulkAction.edit].reduce(
                  (acc, action) => appplyBulkActionEditToRule(acc, action),
                  rule
                );

                const { tags, params: { timelineTitle, timelineId } = {} } = editedRule;
                const index = 'index' in editedRule.params ? editedRule.params.index : undefined;

                await patchRules({
                  rulesClient,
                  rule,
                  tags,
                  index,
                  timelineTitle,
                  timelineId,
                });
              },
              abortController.signal
            );
        }

        if (abortController.signal.aborted === true) {
          throw Error('Bulk action was aborted');
        }

        const errors = [
          ...fetchErrors,
          ...processingResponse.results.filter(
            (resp): resp is RuleActionError => resp?.error !== undefined
          ),
        ];

        if (errors.length > 0) {
          const responseBody = getErrorResponseBody(errors, total);

          return response.custom({
            headers: {
              'content-type': 'application/json',
            },
            body: Buffer.from(JSON.stringify(responseBody)),
            statusCode: 500,
          });
        }

        return response.ok({
          body: {
            success: true,
            rules_count: total,
          },
        });
      } catch (err) {
        const error = transformError(err);
        return siemResponse.error({
          body: error.message,
          statusCode: error.statusCode,
        });
      }
    }
  );
};
