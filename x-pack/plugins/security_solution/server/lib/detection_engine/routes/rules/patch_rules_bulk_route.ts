/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { validate } from '@kbn/securitysolution-io-ts-utils';
import { RuleAlertAction } from '../../../../../common/detection_engine/types';
import {
  patchRulesBulkSchema,
  PatchRulesBulkSchemaDecoded,
} from '../../../../../common/detection_engine/schemas/request/patch_rules_bulk_schema';
import { buildRouteValidation } from '../../../../utils/build_validation/route_validation';
import { rulesBulkSchema } from '../../../../../common/detection_engine/schemas/response/rules_bulk_schema';
import type { SecuritySolutionPluginRouter } from '../../../../types';
import { DETECTION_ENGINE_RULES_URL } from '../../../../../common/constants';
import { SetupPlugins } from '../../../../plugin';
import { buildMlAuthz } from '../../../machine_learning/authz';
import { throwAuthzError } from '../../../machine_learning/validation';
import { transformBulkError, buildSiemResponse } from '../utils';
import { getIdBulkError } from './utils';
import { transformValidateBulkError } from './validate';
import { patchRules } from '../../rules/patch_rules';
import { readRules } from '../../rules/read_rules';
import { PartialFilter } from '../../types';
import { legacyMigrate } from '../../rules/utils';

export const patchRulesBulkRoute = (
  router: SecuritySolutionPluginRouter,
  ml: SetupPlugins['ml']
) => {
  router.patch(
    {
      path: `${DETECTION_ENGINE_RULES_URL}/_bulk_update`,
      validate: {
        body: buildRouteValidation<typeof patchRulesBulkSchema, PatchRulesBulkSchemaDecoded>(
          patchRulesBulkSchema
        ),
      },
      options: {
        tags: ['access:securitySolution'],
      },
    },
    async (context, request, response) => {
      const siemResponse = buildSiemResponse(response);

      const rulesClient = context.alerting.getRulesClient();
      const ruleExecutionLog = context.securitySolution.getRuleExecutionLog();
      const savedObjectsClient = context.core.savedObjects.client;

      const mlAuthz = buildMlAuthz({
        license: context.licensing.license,
        ml,
        request,
        savedObjectsClient,
      });
      const rules = await Promise.all(
        request.body.map(async (payloadRule) => {
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
            filters: filtersRest,
            rule_id: ruleId,
            id,
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
          } = payloadRule;
          const idOrRuleIdOrUnknown = id ?? ruleId ?? '(unknown id)';
          // TODO: Fix these either with an is conversion or by better typing them within io-ts
          const actions: RuleAlertAction[] = actionsRest as RuleAlertAction[];
          const filters: PartialFilter[] | undefined = filtersRest as PartialFilter[];

          try {
            if (type) {
              // reject an unauthorized "promotion" to ML
              throwAuthzError(await mlAuthz.validateRuleType(type));
            }

            const existingRule = await readRules({
              rulesClient,
              ruleId,
              id,
            });
            if (existingRule?.params.type) {
              // reject an unauthorized modification of an ML rule
              throwAuthzError(await mlAuthz.validateRuleType(existingRule?.params.type));
            }

            const migratedRule = await legacyMigrate({
              rulesClient,
              savedObjectsClient,
              rule: existingRule,
            });

            const rule = await patchRules({
              rule: migratedRule,
              rulesClient,
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
              filters,
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
              actions,
              exceptionsList,
            });
            if (rule != null && rule.enabled != null && rule.name != null) {
              const ruleExecutionSummary = await ruleExecutionLog.getExecutionSummary(rule.id);
              return transformValidateBulkError(rule.id, rule, ruleExecutionSummary);
            } else {
              return getIdBulkError({ id, ruleId });
            }
          } catch (err) {
            return transformBulkError(idOrRuleIdOrUnknown, err);
          }
        })
      );

      const [validated, errors] = validate(rules, rulesBulkSchema);
      if (errors != null) {
        return siemResponse.error({ statusCode: 500, body: errors });
      } else {
        return response.ok({ body: validated ?? {} });
      }
    }
  );
};
