/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformError } from '@kbn/securitysolution-es-utils';
import { RuleAlertAction } from '../../../../../common/detection_engine/types';
import { patchRuleValidateTypeDependents } from '../../../../../common/detection_engine/schemas/request/patch_rules_type_dependents';
import { buildRouteValidation } from '../../../../utils/build_validation/route_validation';
import {
  PatchRulesSchemaDecoded,
  patchRulesSchema,
} from '../../../../../common/detection_engine/schemas/request/patch_rules_schema';
import type { SecuritySolutionPluginRouter } from '../../../../types';
import { DETECTION_ENGINE_RULES_URL } from '../../../../../common/constants';
import { SetupPlugins } from '../../../../plugin';
import { buildMlAuthz } from '../../../machine_learning/authz';
import { throwAuthzError } from '../../../machine_learning/validation';
import { patchRules } from '../../rules/patch_rules';
import { buildSiemResponse } from '../utils';

import { getIdError } from './utils';
import { transformValidate } from './validate';
import { readRules } from '../../rules/read_rules';
import { legacyMigrate } from '../../rules/utils';
import { PartialFilter } from '../../types';

export const patchRulesRoute = (
  router: SecuritySolutionPluginRouter,
  ml: SetupPlugins['ml'],
  isRuleRegistryEnabled: boolean
) => {
  router.patch(
    {
      path: DETECTION_ENGINE_RULES_URL,
      validate: {
        body: buildRouteValidation<typeof patchRulesSchema, PatchRulesSchemaDecoded>(
          patchRulesSchema
        ),
      },
      options: {
        tags: ['access:securitySolution'],
      },
    },
    async (context, request, response) => {
      const siemResponse = buildSiemResponse(response);
      const validationErrors = patchRuleValidateTypeDependents(request.body);
      if (validationErrors.length) {
        return siemResponse.error({ statusCode: 400, body: validationErrors });
      }
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
      } = request.body;
      try {
        // TODO: Fix these either with an is conversion or by better typing them within io-ts
        const actions: RuleAlertAction[] = actionsRest as RuleAlertAction[];
        const filters: PartialFilter[] | undefined = filtersRest as PartialFilter[];

        const rulesClient = context.alerting.getRulesClient();
        const ruleExecutionLog = context.securitySolution.getRuleExecutionLog();
        const savedObjectsClient = context.core.savedObjects.client;

        const mlAuthz = buildMlAuthz({
          license: context.licensing.license,
          ml,
          request,
          savedObjectsClient,
        });
        if (type) {
          // reject an unauthorized "promotion" to ML
          throwAuthzError(await mlAuthz.validateRuleType(type));
        }

        const existingRule = await readRules({
          isRuleRegistryEnabled,
          rulesClient,
          ruleId,
          id,
        });
        if (existingRule?.params.type) {
          // reject an unauthorized modification of an ML rule
          throwAuthzError(await mlAuthz.validateRuleType(existingRule?.params.type));
        }
        console.log('HERE');
        const migratedRule = await legacyMigrate({
          rulesClient,
          savedObjectsClient,
          rule: existingRule,
        });
        console.log({ migratedRule });
        const rule = await patchRules({
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
          rule: migratedRule,
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

          const [validated, errors] = transformValidate(
            rule,
            ruleExecutionSummary,
            isRuleRegistryEnabled
          );
          if (errors != null) {
            return siemResponse.error({ statusCode: 500, body: errors });
          } else {
            return response.ok({ body: validated ?? {} });
          }
        } else {
          const error = getIdError({ id, ruleId });
          return siemResponse.error({
            body: error.message,
            statusCode: error.statusCode,
          });
        }
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
