/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { validate } from '../../../../../common/validate';
import { createRuleValidateTypeDependents } from '../../../../../common/detection_engine/schemas/request/create_rules_type_dependents';
import { RuleAlertAction } from '../../../../../common/detection_engine/types';
import {
  CreateRulesBulkSchemaDecoded,
  createRulesBulkSchema,
} from '../../../../../common/detection_engine/schemas/request/create_rules_bulk_schema';
import { rulesBulkSchema } from '../../../../../common/detection_engine/schemas/response/rules_bulk_schema';
import { IRouter } from '../../../../../../../../src/core/server';
import { DETECTION_ENGINE_RULES_URL } from '../../../../../common/constants';
import { SetupPlugins } from '../../../../plugin';
import { buildMlAuthz } from '../../../machine_learning/authz';
import { throwHttpError } from '../../../machine_learning/validation';
import { createRules } from '../../rules/create_rules';
import { readRules } from '../../rules/read_rules';
import { getDuplicates } from './utils';
import { transformValidateBulkError } from './validate';
import { getIndexExists } from '../../index/get_index_exists';
import { buildRouteValidation } from '../../../../utils/build_validation/route_validation';

import { transformBulkError, createBulkErrorObject, buildSiemResponse } from '../utils';
import { updateRulesNotifications } from '../../rules/update_rules_notifications';
import { PartialFilter } from '../../types';

export const createRulesBulkRoute = (router: IRouter, ml: SetupPlugins['ml']) => {
  router.post(
    {
      path: `${DETECTION_ENGINE_RULES_URL}/_bulk_create`,
      validate: {
        body: buildRouteValidation<typeof createRulesBulkSchema, CreateRulesBulkSchemaDecoded>(
          createRulesBulkSchema
        ),
      },
      options: {
        tags: ['access:securitySolution'],
      },
    },
    async (context, request, response) => {
      const siemResponse = buildSiemResponse(response);
      const alertsClient = context.alerting?.getAlertsClient();
      const clusterClient = context.core.elasticsearch.legacy.client;
      const savedObjectsClient = context.core.savedObjects.client;
      const siemClient = context.securitySolution?.getAppClient();

      if (!siemClient || !alertsClient) {
        return siemResponse.error({ statusCode: 404 });
      }

      const mlAuthz = buildMlAuthz({ license: context.licensing.license, ml, request });

      const ruleDefinitions = request.body;
      const dupes = getDuplicates(ruleDefinitions, 'rule_id');

      const rules = await Promise.all(
        ruleDefinitions
          .filter((rule) => rule.rule_id == null || !dupes.includes(rule.rule_id))
          .map(async (payloadRule) => {
            const {
              actions: actionsRest,
              anomaly_threshold: anomalyThreshold,
              author,
              building_block_type: buildingBlockType,
              description,
              enabled,
              false_positives: falsePositives,
              from,
              query: queryOrUndefined,
              language: languageOrUndefined,
              license,
              machine_learning_job_id: machineLearningJobId,
              output_index: outputIndex,
              saved_id: savedId,
              meta,
              filters: filtersRest,
              rule_id: ruleId,
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
              threat,
              throttle,
              timestamp_override: timestampOverride,
              to,
              type,
              references,
              note,
              timeline_id: timelineId,
              timeline_title: timelineTitle,
              version,
              exceptions_list: exceptionsList,
            } = payloadRule;
            try {
              const validationErrors = createRuleValidateTypeDependents(payloadRule);
              if (validationErrors.length) {
                return createBulkErrorObject({
                  ruleId,
                  statusCode: 400,
                  message: validationErrors.join(),
                });
              }

              const query =
                type !== 'machine_learning' && queryOrUndefined == null ? '' : queryOrUndefined;

              const language =
                type !== 'machine_learning' && languageOrUndefined == null
                  ? 'kuery'
                  : languageOrUndefined;

              // TODO: Fix these either with an is conversion or by better typing them within io-ts
              const actions: RuleAlertAction[] = actionsRest as RuleAlertAction[];
              const filters: PartialFilter[] | undefined = filtersRest as PartialFilter[];
              throwHttpError(await mlAuthz.validateRuleType(type));

              const finalIndex = outputIndex ?? siemClient.getSignalsIndex();
              const indexExists = await getIndexExists(clusterClient.callAsCurrentUser, finalIndex);
              if (!indexExists) {
                return createBulkErrorObject({
                  ruleId,
                  statusCode: 400,
                  message: `To create a rule, the index must exist first. Index ${finalIndex} does not exist`,
                });
              }
              if (ruleId != null) {
                const rule = await readRules({ alertsClient, ruleId, id: undefined });
                if (rule != null) {
                  return createBulkErrorObject({
                    ruleId,
                    statusCode: 409,
                    message: `rule_id: "${ruleId}" already exists`,
                  });
                }
              }
              const createdRule = await createRules({
                alertsClient,
                anomalyThreshold,
                author,
                buildingBlockType,
                description,
                enabled,
                falsePositives,
                from,
                immutable: false,
                query,
                language,
                license,
                machineLearningJobId,
                outputIndex: finalIndex,
                savedId,
                timelineId,
                timelineTitle,
                meta,
                filters,
                ruleId,
                index,
                interval,
                maxSignals,
                name,
                riskScore,
                riskScoreMapping,
                ruleNameOverride,
                severity,
                severityMapping,
                tags,
                to,
                type,
                threat,
                timestampOverride,
                references,
                note,
                version,
                exceptionsList,
                actions: throttle === 'rule' ? actions : [], // Only enable actions if throttle is set to rule, otherwise we are a notification and should not enable it,
              });

              const ruleActions = await updateRulesNotifications({
                ruleAlertId: createdRule.id,
                alertsClient,
                savedObjectsClient,
                enabled,
                actions,
                throttle,
                name,
              });

              return transformValidateBulkError(ruleId, createdRule, ruleActions);
            } catch (err) {
              return transformBulkError(ruleId, err);
            }
          })
      );
      const rulesBulk = [
        ...rules,
        ...dupes.map((ruleId) =>
          createBulkErrorObject({
            ruleId,
            statusCode: 409,
            message: `rule_id: "${ruleId}" already exists`,
          })
        ),
      ];
      const [validated, errors] = validate(rulesBulk, rulesBulkSchema);
      if (errors != null) {
        return siemResponse.error({ statusCode: 500, body: errors });
      } else {
        return response.ok({ body: validated ?? {} });
      }
    }
  );
};
