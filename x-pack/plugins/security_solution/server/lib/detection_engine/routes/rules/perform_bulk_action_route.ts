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

import {
  DETECTION_ENGINE_RULES_BULK_ACTION,
  MAX_RULES_TO_UPDATE_IN_PARALLEL,
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

        const rules = await findRules({
          isRuleRegistryEnabled,
          rulesClient,
          perPage: MAX_RULES_TO_PROCESS_TOTAL,
          filter: body.query !== '' ? body.query : undefined,
          page: undefined,
          sortField: undefined,
          sortOrder: undefined,
          fields: undefined,
        });

        if (rules.total > MAX_RULES_TO_PROCESS_TOTAL) {
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
              rules.data,
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
              rules.data,
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
              rules.data,
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
              rules.data,
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
              rules.data.map(({ params }) => ({ rule_id: params.ruleId })),
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
              rules.data,
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

        const errors = processingResponse.results.filter(
          (resp): resp is RuleActionError => resp?.error !== undefined
        );
        const rulesCount = rules.data.length;

        if (errors.length > 0) {
          const responseBody = getErrorResponseBody(errors, rulesCount);

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
            rules_count: rulesCount,
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
