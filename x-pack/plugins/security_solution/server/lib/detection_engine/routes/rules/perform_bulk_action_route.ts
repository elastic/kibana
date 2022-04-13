/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { truncate } from 'lodash';
import moment from 'moment';
import { BadRequestError, transformError } from '@kbn/securitysolution-es-utils';
import { KibanaResponseFactory, Logger } from 'src/core/server';
import { SavedObjectsClientContract } from 'kibana/server';

import { RuleAlertType } from '../../rules/types';

import type { RulesClient, BulkEditError } from '../../../../../../alerting/server';
import { SanitizedRule } from '../../../../../../alerting/common';

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
import {
  initPromisePool,
  PromisePoolError,
  PromisePoolOutcome,
} from '../../../../utils/promise_pool';
import { buildMlAuthz } from '../../../machine_learning/authz';
import { throwAuthzError } from '../../../machine_learning/validation';
import { deleteRules } from '../../rules/delete_rules';
import { duplicateRule } from '../../rules/duplicate_rule';
import { findRules } from '../../rules/find_rules';
import { readRules } from '../../rules/read_rules';
import { bulkEditRules } from '../../rules/bulk_edit_rules';
import {
  operationAdapterForRulesClient,
  splitBulkEditActions,
  ruleParamsModifier,
} from '../../rules/bulk_action_edit';
import { getExportByObjectIds } from '../../rules/get_export_by_object_ids';
import { buildSiemResponse } from '../utils';
import { AbortError } from '../../../../../../../../src/plugins/kibana_utils/common';
import { internalRuleToAPIResponse } from '../../schemas/rule_converters';
import { legacyMigrate } from '../../rules/utils';
import { RuleParams } from '../../schemas/rule_schemas';

const MAX_RULES_TO_PROCESS_TOTAL = 10000;
const MAX_ERROR_MESSAGE_LENGTH = 1000;
const MAX_ROUTE_CONCURRENCY = 5;

interface NormalizedRuleError {
  message: string;
  status_code: number;
  rules: Array<{
    id: string;
    name: string;
  }>;
}

type BulkActionError = PromisePoolError<string> | PromisePoolError<RuleAlertType> | BulkEditError;

const normalizeErrorResponse = (errors: BulkActionError[]): NormalizedRuleError[] => {
  const errorsMap = new Map();

  errors.forEach((errorObj) => {
    let message;
    let statusCode;
    let rule;
    if ('rule' in errorObj) {
      rule = errorObj.rule;
      message = errorObj.message;
    } else {
      const { error, item } = errorObj;
      const transformedError =
        error instanceof Error
          ? transformError(error)
          : { message: String(error), statusCode: 500 };

      message = transformedError.message;
      statusCode = transformedError.statusCode;
      // The promise pool item is either a rule ID string or a rule object. We have
      // string IDs when we fail to fetch rules. Rule objects come from other
      // situations when we found a rule but failed somewhere else.
      rule = typeof item === 'string' ? { id: item } : { id: item.id, name: item.name };
    }

    if (errorsMap.has(message)) {
      errorsMap.get(message).rules.push(rule);
    } else {
      errorsMap.set(message, {
        message: truncate(message, { length: MAX_ERROR_MESSAGE_LENGTH }),
        status_code: statusCode,
        rules: [rule],
      });
    }
  });

  return Array.from(errorsMap, ([_, normalizedError]) => normalizedError);
};

const buildBulkResponse = (
  response: KibanaResponseFactory,
  {
    errors = [],
    updated = [],
    created = [],
    deleted = [],
  }: {
    errors?: BulkActionError[];
    updated?: RuleAlertType[];
    created?: RuleAlertType[];
    deleted?: RuleAlertType[];
  }
) => {
  const succeeded = updated.length + created.length + deleted.length;
  const summary = {
    failed: errors.length,
    succeeded,
    total: succeeded + errors.length,
  };

  const results = {
    updated: updated.map((rule) => internalRuleToAPIResponse(rule)),
    created: created.map((rule) => internalRuleToAPIResponse(rule)),
    deleted: deleted.map((rule) => internalRuleToAPIResponse(rule)),
  };

  if (errors.length > 0) {
    return response.custom({
      headers: { 'content-type': 'application/json' },
      body: Buffer.from(
        JSON.stringify({
          message: summary.succeeded > 0 ? 'Bulk edit partially failed' : 'Bulk edit failed',
          status_code: 500,
          attributes: {
            errors: normalizeErrorResponse(errors),
            results,
            summary,
          },
        })
      ),
      statusCode: 500,
    });
  }

  return response.ok({
    body: {
      success: true,
      rules_count: summary.total,
      attributes: { results, summary },
    },
  });
};

const fetchRulesByQueryOrIds = async ({
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
}): Promise<PromisePoolOutcome<string, RuleAlertType>> => {
  if (ids) {
    return initPromisePool({
      concurrency: MAX_RULES_TO_UPDATE_IN_PARALLEL,
      items: ids,
      executor: async (id: string) => {
        const rule = await readRules({ id, rulesClient, isRuleRegistryEnabled, ruleId: undefined });
        if (rule == null) {
          throw Error('Rule not found');
        }
        return rule;
      },
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

  if (total > MAX_RULES_TO_PROCESS_TOTAL) {
    throw new BadRequestError(
      `More than ${MAX_RULES_TO_PROCESS_TOTAL} rules matched the filter query. Try to narrow it down.`
    );
  }

  return {
    results: data.map((rule) => ({ item: rule.id, result: rule })),
    errors: [],
  };
};

/**
 * Helper method to migrate any legacy actions a rule may have. If no actions or no legacy actions
 * no migration is performed.
 * @params rulesClient
 * @params savedObjectsClient
 * @params rule - rule to be migrated
 * @returns The migrated rule
 */
export const migrateRuleActions = async ({
  rulesClient,
  savedObjectsClient,
  rule,
}: {
  rulesClient: RulesClient;
  savedObjectsClient: SavedObjectsClientContract;
  rule: RuleAlertType;
}): Promise<SanitizedRule<RuleParams>> => {
  const migratedRule = await legacyMigrate({
    rulesClient,
    savedObjectsClient,
    rule,
  });

  // This should only be hit if `rule` passed into `legacyMigrate`
  // is `null` or `rule.id` is null which right now, as typed, should not occur
  // but catching if does, in which case something upstream would be breaking down
  if (migratedRule == null) {
    throw new Error(`An error occurred processing rule with id:${rule.id}`);
  }

  return migratedRule;
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
      const body = request.body;
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
        const rulesClient: RulesClient = context.alerting.getRulesClient();
        const ruleExecutionLog = context.securitySolution.getRuleExecutionLog();
        const exceptionsClient = context.lists?.getExceptionListClient();
        const savedObjectsClient = context.core.savedObjects.client;

        const mlAuthz = buildMlAuthz({
          license: context.licensing.license,
          ml,
          request,
          savedObjectsClient,
        });

        const query = body.query !== '' ? body.query : undefined;

        if (body.action === BulkAction.edit) {
          const { rulesClientOperations, ruleParamsModifierActions } = splitBulkEditActions(
            body.edit
          );

          const { rules, errors } = await bulkEditRules({
            rulesClient,
            isRuleRegistryEnabled,
            filter: query,
            ...(body.ids ? { ids: body.ids ?? [] } : {}),
            operations: rulesClientOperations.map(operationAdapterForRulesClient),
            paramsModifier: async (ruleParams: RuleAlertType['params']) => {
              throwAuthzError(await mlAuthz.validateRuleType(ruleParams.type));

              return ruleParamsModifier(ruleParams, ruleParamsModifierActions);
            },
          });

          return buildBulkResponse(response, { updated: rules, errors });
        }

        const fetchRulesOutcome = await fetchRulesByQueryOrIds({
          isRuleRegistryEnabled,
          rulesClient,
          query,
          ids: body.ids,
          abortSignal: abortController.signal,
        });

        const rules = fetchRulesOutcome.results.map(({ result }) => result);
        let bulkActionOutcome: PromisePoolOutcome<RuleAlertType, RuleAlertType | null>;
        let updated: RuleAlertType[] = [];
        let created: RuleAlertType[] = [];
        let deleted: RuleAlertType[] = [];

        switch (body.action) {
          case BulkAction.enable:
            bulkActionOutcome = await initPromisePool({
              concurrency: MAX_RULES_TO_UPDATE_IN_PARALLEL,
              items: rules,
              executor: async (rule) => {
                const migratedRule = await migrateRuleActions({
                  rulesClient,
                  savedObjectsClient,
                  rule,
                });

                if (!migratedRule.enabled) {
                  throwAuthzError(await mlAuthz.validateRuleType(migratedRule.params.type));
                  await rulesClient.enable({ id: migratedRule.id });
                }

                return {
                  ...migratedRule,
                  enabled: true,
                };
              },
              abortSignal: abortController.signal,
            });
            updated = bulkActionOutcome.results
              .map(({ result }) => result)
              .filter((rule): rule is RuleAlertType => rule !== null);
            break;
          case BulkAction.disable:
            bulkActionOutcome = await initPromisePool({
              concurrency: MAX_RULES_TO_UPDATE_IN_PARALLEL,
              items: rules,
              executor: async (rule) => {
                const migratedRule = await migrateRuleActions({
                  rulesClient,
                  savedObjectsClient,
                  rule,
                });

                if (migratedRule.enabled) {
                  throwAuthzError(await mlAuthz.validateRuleType(migratedRule.params.type));
                  await rulesClient.disable({ id: migratedRule.id });
                }

                return {
                  ...migratedRule,
                  enabled: false,
                };
              },
              abortSignal: abortController.signal,
            });
            updated = bulkActionOutcome.results
              .map(({ result }) => result)
              .filter((rule): rule is RuleAlertType => rule !== null);
            break;
          case BulkAction.delete:
            bulkActionOutcome = await initPromisePool({
              concurrency: MAX_RULES_TO_UPDATE_IN_PARALLEL,
              items: rules,
              executor: async (rule) => {
                const migratedRule = await migrateRuleActions({
                  rulesClient,
                  savedObjectsClient,
                  rule,
                });

                await deleteRules({
                  ruleId: migratedRule.id,
                  rulesClient,
                  ruleExecutionLog,
                });

                return null;
              },
              abortSignal: abortController.signal,
            });
            deleted = bulkActionOutcome.results
              .map(({ item }) => item)
              .filter((rule): rule is RuleAlertType => rule !== null);
            break;
          case BulkAction.duplicate:
            bulkActionOutcome = await initPromisePool({
              concurrency: MAX_RULES_TO_UPDATE_IN_PARALLEL,
              items: rules,
              executor: async (rule) => {
                const migratedRule = await migrateRuleActions({
                  rulesClient,
                  savedObjectsClient,
                  rule,
                });

                throwAuthzError(await mlAuthz.validateRuleType(migratedRule.params.type));

                const createdRule = await rulesClient.create({
                  data: duplicateRule(migratedRule, isRuleRegistryEnabled),
                });

                return createdRule;
              },
              abortSignal: abortController.signal,
            });
            created = bulkActionOutcome.results
              .map(({ item }) => item)
              .filter((rule): rule is RuleAlertType => rule !== null);
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
        }

        if (abortController.signal.aborted === true) {
          throw new AbortError('Bulk action was aborted');
        }

        return buildBulkResponse(response, {
          updated,
          deleted,
          created,
          errors: [...fetchRulesOutcome.errors, ...bulkActionOutcome.errors],
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
