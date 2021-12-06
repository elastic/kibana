/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformError } from '@kbn/securitysolution-es-utils';
import { Logger } from 'src/core/server';
import { set } from '@elastic/safer-lodash-set';

import { DETECTION_ENGINE_RULES_BULK_ACTION } from '../../../../../common/constants';
import {
  BulkAction,
  BulkActionUpdateType,
} from '../../../../../common/detection_engine/schemas/common/schemas';
import { RulesSchema } from '../../../../../common/detection_engine/schemas/response/rules_schema';
import { performBulkActionSchema } from '../../../../../common/detection_engine/schemas/request/perform_bulk_action_schema';
import { SetupPlugins } from '../../../../plugin';
import type { SecuritySolutionPluginRouter } from '../../../../types';
import { buildRouteValidation } from '../../../../utils/build_validation/route_validation';
import { buildMlAuthz } from '../../../machine_learning/authz';
import { throwHttpError } from '../../../machine_learning/validation';
import { deleteRules } from '../../rules/delete_rules';
import { duplicateRule } from '../../rules/duplicate_rule';
import { enableRule } from '../../rules/enable_rule';
import { findRules } from '../../rules/find_rules';
import { patchRules } from '../../rules/patch_rules';
import { getExportByObjectIds } from '../../rules/get_export_by_object_ids';
import { buildSiemResponse } from '../utils';
import { transformAlertToRule } from './utils';
import { PartialFilter } from '../../types';

const BULK_ACTION_RULES_LIMIT = 10000;

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
        tags: ['access:securitySolution'],
      },
    },
    async (context, request, response) => {
      const { body } = request;
      const siemResponse = buildSiemResponse(response);

      try {
        const rulesClient = context.alerting?.getRulesClient();
        const exceptionsClient = context.lists?.getExceptionListClient();
        const savedObjectsClient = context.core.savedObjects.client;
        const ruleStatusClient = context.securitySolution.getExecutionLogClient();

        const mlAuthz = buildMlAuthz({
          license: context.licensing.license,
          ml,
          request,
          savedObjectsClient,
        });

        if (!rulesClient) {
          return siemResponse.error({ statusCode: 404 });
        }

        const rules = await findRules({
          isRuleRegistryEnabled,
          rulesClient,
          perPage: BULK_ACTION_RULES_LIMIT,
          filter: body.query !== '' ? body.query : undefined,
          page: undefined,
          sortField: undefined,
          sortOrder: undefined,
          fields: undefined,
        });

        if (rules.total > BULK_ACTION_RULES_LIMIT) {
          return siemResponse.error({
            body: `More than ${BULK_ACTION_RULES_LIMIT} rules matched the filter query. Try to narrow it down.`,
            statusCode: 400,
          });
        }

        switch (body.action) {
          case BulkAction.enable:
            await Promise.all(
              rules.data.map(async (rule) => {
                if (!rule.enabled) {
                  throwHttpError(await mlAuthz.validateRuleType(rule.params.type));
                  await enableRule({
                    rule,
                    rulesClient,
                  });
                }
              })
            );
            break;
          case BulkAction.disable:
            await Promise.all(
              rules.data.map(async (rule) => {
                if (rule.enabled) {
                  throwHttpError(await mlAuthz.validateRuleType(rule.params.type));
                  await rulesClient.disable({ id: rule.id });
                }
              })
            );
            break;
          case BulkAction.delete:
            await Promise.all(
              rules.data.map(async (rule) => {
                await deleteRules({
                  ruleId: rule.id,
                  rulesClient,
                  ruleStatusClient,
                });
              })
            );
            break;
          case BulkAction.duplicate:
            await Promise.all(
              rules.data.map(async (rule) => {
                throwHttpError(await mlAuthz.validateRuleType(rule.params.type));

                await rulesClient.create({
                  data: duplicateRule(rule, isRuleRegistryEnabled),
                });
              })
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
          case BulkAction.update:
            const isArrProp = (
              field: 'index' | 'tags' | 'timeline_id'
            ): field is 'tags' | 'index' => {
              return field === 'index' || field === 'tags';
            };
            await Promise.all(
              rules.data.map(async (existingRule) => {
                const transformedRule = transformAlertToRule(existingRule);
                body?.updates?.map?.(({ type, field, value }) => {
                  switch (type) {
                    case BulkActionUpdateType.add:
                      if (isArrProp(field)) {
                        transformedRule[field] = Array.from(
                          new Set([...(transformedRule[field] ?? []), ...value])
                        );
                      }
                      break;

                    case BulkActionUpdateType.delete:
                      if (isArrProp(field)) {
                        const valueSet = new Set(value ?? []);
                        transformedRule[field] =
                          transformedRule[field]?.filter((item) => !valueSet.has(item)) ?? [];
                      }
                      break;

                    case BulkActionUpdateType.set:
                      set(transformedRule, field, value);
                  }

                  return transformedRule;
                });

                const {
                  actions: actionsRest,
                  author,
                  building_block_type: buildingBlockType,
                  description,
                  enabled,
                  event_category_override: eventCategoryOverride,
                  false_positives: falsePositives,
                  from,
                  query,
                  language,
                  license,
                  output_index: outputIndex,
                  saved_id: savedId,
                  timeline_id: timelineId,
                  timeline_title: timelineTitle,
                  meta,
                  filters,
                  index,
                  interval,
                  max_signals: maxSignals,
                  risk_score: riskScore,
                  risk_score_mapping: riskScoreMapping,
                  rule_name_override: ruleNameOverride,
                  name,
                  severity,
                  severity_mapping: severityMapping,
                  tags,
                  to,
                  type,
                  threat,
                  threshold,
                  threat_filters: threatFilters,
                  threat_index: threatIndex,
                  threat_indicator_path: threatIndicatorPath,
                  threat_query: threatQuery,
                  threat_mapping: threatMapping,
                  threat_language: threatLanguage,
                  concurrent_searches: concurrentSearches,
                  items_per_search: itemsPerSearch,
                  timestamp_override: timestampOverride,
                  throttle,
                  references,
                  note,
                  version,
                  anomaly_threshold: anomalyThreshold,
                  machine_learning_job_id: machineLearningJobId,
                  exceptions_list: exceptionsList,
                } = transformedRule;

                await patchRules({
                  rulesClient,
                  rule: existingRule,
                  author,
                  buildingBlockType,
                  description,
                  enabled,
                  eventCategoryOverride,
                  falsePositives,
                  from,
                  query,
                  language,
                  license,
                  outputIndex,
                  savedId,
                  timelineId,
                  timelineTitle,
                  meta,
                  filters: filters as PartialFilter[],
                  index,
                  interval,
                  maxSignals,
                  riskScore,
                  riskScoreMapping,
                  ruleNameOverride,
                  name,
                  severity,
                  severityMapping,
                  tags,
                  to,
                  type,
                  threat,
                  threshold,
                  threatFilters,
                  threatIndex,
                  threatIndicatorPath,
                  threatQuery,
                  threatMapping,
                  threatLanguage,
                  throttle,
                  concurrentSearches,
                  itemsPerSearch,
                  timestampOverride,
                  references,
                  note,
                  version,
                  anomalyThreshold,
                  machineLearningJobId,
                  actions: actionsRest,
                  exceptionsList,
                });
              })
            );
        }

        return response.ok({ body: { success: true, rules_count: rules.data.length } });
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
