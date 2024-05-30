/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKibanaResponse, Logger } from '@kbn/core/server';
import { AbortError } from '@kbn/kibana-utils-plugin/common';
import { transformError } from '@kbn/securitysolution-es-utils';
import type { ConfigType } from '../../../../../../config';
import type { PerformBulkActionResponse } from '../../../../../../../common/api/detection_engine/rule_management';
import {
  BulkActionTypeEnum,
  PerformBulkActionRequestBody,
  PerformBulkActionRequestQuery,
} from '../../../../../../../common/api/detection_engine/rule_management';
import {
  DETECTION_ENGINE_RULES_BULK_ACTION,
  MAX_RULES_TO_UPDATE_IN_PARALLEL,
  RULES_TABLE_MAX_PAGE_SIZE,
} from '../../../../../../../common/constants';
import type { SetupPlugins } from '../../../../../../plugin';
import type { SecuritySolutionPluginRouter } from '../../../../../../types';
import { buildRouteValidationWithZod } from '../../../../../../utils/build_validation/route_validation';
import { initPromisePool } from '../../../../../../utils/promise_pool';
import { routeLimitedConcurrencyTag } from '../../../../../../utils/route_limited_concurrency_tag';
import { buildMlAuthz } from '../../../../../machine_learning/authz';
import { buildSiemResponse } from '../../../../routes/utils';
import type { RuleAlertType } from '../../../../rule_schema';
import { duplicateExceptions } from '../../../logic/actions/duplicate_exceptions';
import { duplicateRule } from '../../../logic/actions/duplicate_rule';
import { bulkEditRules } from '../../../logic/bulk_actions/bulk_edit_rules';
import {
  dryRunValidateBulkEditRule,
  validateBulkDuplicateRule,
} from '../../../logic/bulk_actions/validations';
import { getExportByObjectIds } from '../../../logic/export/get_export_by_object_ids';
import { RULE_MANAGEMENT_BULK_ACTION_SOCKET_TIMEOUT_MS } from '../../timeouts';
import type { BulkActionError } from './bulk_actions_response';
import { buildBulkResponse } from './bulk_actions_response';
import { bulkEnableDisableRules } from './bulk_enable_disable_rules';
import { fetchRulesByQueryOrIds } from './fetch_rules_by_query_or_ids';

export const MAX_RULES_TO_PROCESS_TOTAL = 10000;
const MAX_ROUTE_CONCURRENCY = 5;

export const performBulkActionRoute = (
  router: SecuritySolutionPluginRouter,
  config: ConfigType,
  ml: SetupPlugins['ml'],
  logger: Logger
) => {
  router.versioned
    .post({
      access: 'public',
      path: DETECTION_ENGINE_RULES_BULK_ACTION,
      options: {
        tags: ['access:securitySolution', routeLimitedConcurrencyTag(MAX_ROUTE_CONCURRENCY)],
        timeout: {
          idleSocket: RULE_MANAGEMENT_BULK_ACTION_SOCKET_TIMEOUT_MS,
        },
      },
    })
    .addVersion(
      {
        version: '2023-10-31',
        validate: {
          request: {
            body: buildRouteValidationWithZod(PerformBulkActionRequestBody),
            query: buildRouteValidationWithZod(PerformBulkActionRequestQuery),
          },
        },
      },

      async (context, request, response): Promise<IKibanaResponse<PerformBulkActionResponse>> => {
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

        const isDryRun = request.query.dry_run;

        // dry run is not supported for export, as it doesn't change ES state and has different response format(exported JSON file)
        if (isDryRun && body.action === BulkActionTypeEnum.export) {
          return siemResponse.error({
            body: `Export action doesn't support dry_run mode`,
            statusCode: 400,
          });
        }

        const abortController = new AbortController();

        // subscribing to completed$, because it handles both cases when request was completed and aborted.
        // when route is finished by timeout, aborted$ is not getting fired
        request.events.completed$.subscribe(() => abortController.abort());
        try {
          const ctx = await context.resolve([
            'core',
            'securitySolution',
            'alerting',
            'licensing',
            'lists',
            'actions',
          ]);

          const rulesClient = ctx.alerting.getRulesClient();
          const exceptionsClient = ctx.lists?.getExceptionListClient();
          const savedObjectsClient = ctx.core.savedObjects.client;
          const actionsClient = ctx.actions.getActionsClient();
          const rulesManagementClient = ctx.securitySolution.getRulesManagementClient();

          const { getExporter, getClient } = ctx.core.savedObjects;
          const client = getClient({ includedHiddenTypes: ['action'] });

          const exporter = getExporter(client);

          const mlAuthz = buildMlAuthz({
            license: ctx.licensing.license,
            ml,
            request,
            savedObjectsClient,
          });

          const query = body.query !== '' ? body.query : undefined;

          // handling this action before switch statement as bulkEditRules fetch rules within
          // rulesClient method, hence there is no need to use fetchRulesByQueryOrIds utility
          if (body.action === BulkActionTypeEnum.edit && !isDryRun) {
            const { rules, errors, skipped } = await bulkEditRules({
              rulesClient,
              filter: query,
              ids: body.ids,
              actions: body.edit,
              mlAuthz,
              experimentalFeatures: config.experimentalFeatures,
            });

            return buildBulkResponse(response, {
              updated: rules,
              skipped,
              errors,
            });
          }

          const fetchRulesOutcome = await fetchRulesByQueryOrIds({
            rulesClient,
            query,
            ids: body.ids,
            abortSignal: abortController.signal,
          });

          const rules = fetchRulesOutcome.results.map(({ result }) => result);
          const errors: BulkActionError[] = [...fetchRulesOutcome.errors];
          let updated: RuleAlertType[] = [];
          let created: RuleAlertType[] = [];
          let deleted: RuleAlertType[] = [];

          switch (body.action) {
            case BulkActionTypeEnum.enable: {
              const { updatedRules, errors: bulkActionErrors } = await bulkEnableDisableRules({
                rules,
                isDryRun,
                rulesClient,
                action: 'enable',
                mlAuthz,
              });
              errors.push(...bulkActionErrors);
              updated = updatedRules;
              break;
            }
            case BulkActionTypeEnum.disable: {
              const { updatedRules, errors: bulkActionErrors } = await bulkEnableDisableRules({
                rules,
                isDryRun,
                rulesClient,
                action: 'disable',
                mlAuthz,
              });
              errors.push(...bulkActionErrors);
              updated = updatedRules;
              break;
            }
            case BulkActionTypeEnum.delete: {
              const bulkActionOutcome = await initPromisePool({
                concurrency: MAX_RULES_TO_UPDATE_IN_PARALLEL,
                items: rules,
                executor: async (rule) => {
                  // during dry run return early for delete, as no validations needed for this action
                  if (isDryRun) {
                    return null;
                  }

                  await rulesManagementClient.deleteRule({
                    ruleId: rule.id,
                  });

                  return null;
                },
                abortSignal: abortController.signal,
              });
              errors.push(...bulkActionOutcome.errors);
              deleted = bulkActionOutcome.results
                .map(({ item }) => item)
                .filter((rule): rule is RuleAlertType => rule !== null);
              break;
            }
            case BulkActionTypeEnum.duplicate: {
              const bulkActionOutcome = await initPromisePool({
                concurrency: MAX_RULES_TO_UPDATE_IN_PARALLEL,
                items: rules,
                executor: async (rule) => {
                  await validateBulkDuplicateRule({ mlAuthz, rule });

                  // during dry run only validation is getting performed and rule is not saved in ES, thus return early
                  if (isDryRun) {
                    return rule;
                  }

                  let shouldDuplicateExceptions = true;
                  let shouldDuplicateExpiredExceptions = true;
                  if (body.duplicate !== undefined) {
                    shouldDuplicateExceptions = body.duplicate.include_exceptions;
                    shouldDuplicateExpiredExceptions = body.duplicate.include_expired_exceptions;
                  }

                  const duplicateRuleToCreate = await duplicateRule({
                    rule,
                  });

                  const createdRule = await rulesClient.create({
                    data: duplicateRuleToCreate,
                  });

                  // we try to create exceptions after rule created, and then update rule
                  const exceptions = shouldDuplicateExceptions
                    ? await duplicateExceptions({
                        ruleId: rule.params.ruleId,
                        exceptionLists: rule.params.exceptionsList,
                        includeExpiredExceptions: shouldDuplicateExpiredExceptions,
                        exceptionsClient,
                      })
                    : [];

                  const updatedRule = await rulesClient.update({
                    id: createdRule.id,
                    data: {
                      ...duplicateRuleToCreate,
                      params: {
                        ...duplicateRuleToCreate.params,
                        exceptionsList: exceptions,
                      },
                    },
                    shouldIncrementRevision: () => false,
                  });

                  // TODO: figureout why types can't return just updatedRule
                  return { ...createdRule, ...updatedRule };
                },
                abortSignal: abortController.signal,
              });
              errors.push(...bulkActionOutcome.errors);
              created = bulkActionOutcome.results
                .map(({ result }) => result)
                .filter((rule): rule is RuleAlertType => rule !== null);
              break;
            }
            case BulkActionTypeEnum.export: {
              const exported = await getExportByObjectIds(
                rulesClient,
                exceptionsClient,
                rules.map(({ params }) => params.ruleId),
                exporter,
                request,
                actionsClient
              );

              const responseBody = `${exported.rulesNdjson}${exported.exceptionLists}${exported.actionConnectors}${exported.exportDetails}`;

              return response.ok({
                headers: {
                  'Content-Disposition': `attachment; filename="rules_export.ndjson"`,
                  'Content-Type': 'application/ndjson',
                },
                body: responseBody,
              });
            }

            // will be processed only when isDryRun === true
            // during dry run only validation is getting performed and rule is not saved in ES
            case BulkActionTypeEnum.edit: {
              const bulkActionOutcome = await initPromisePool({
                concurrency: MAX_RULES_TO_UPDATE_IN_PARALLEL,
                items: rules,
                executor: async (rule) => {
                  await dryRunValidateBulkEditRule({
                    mlAuthz,
                    rule,
                    edit: body.edit,
                    experimentalFeatures: config.experimentalFeatures,
                  });

                  return rule;
                },
                abortSignal: abortController.signal,
              });
              errors.push(...bulkActionOutcome.errors);
              updated = bulkActionOutcome.results
                .map(({ result }) => result)
                .filter((rule): rule is RuleAlertType => rule !== null);
              break;
            }
          }

          if (abortController.signal.aborted === true) {
            throw new AbortError('Bulk action was aborted');
          }

          return buildBulkResponse(response, {
            updated,
            deleted,
            created,
            errors,
            isDryRun,
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
