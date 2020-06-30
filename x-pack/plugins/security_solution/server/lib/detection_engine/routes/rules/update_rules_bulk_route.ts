/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { validate } from '../../../../../common/validate';
import { updateRuleValidateTypeDependents } from '../../../../../common/detection_engine/schemas/request/update_rules_type_dependents';
import { RuleAlertAction } from '../../../../../common/detection_engine/types';
import { buildRouteValidation } from '../../../../utils/build_validation/route_validation';
import {
  updateRulesBulkSchema,
  UpdateRulesBulkSchemaDecoded,
} from '../../../../../common/detection_engine/schemas/request/update_rules_bulk_schema';
import { rulesBulkSchema } from '../../../../../common/detection_engine/schemas/response/rules_bulk_schema';
import { IRouter } from '../../../../../../../../src/core/server';
import { DETECTION_ENGINE_RULES_URL } from '../../../../../common/constants';
import { SetupPlugins } from '../../../../plugin';
import { buildMlAuthz } from '../../../machine_learning/authz';
import { throwHttpError } from '../../../machine_learning/validation';
import { getIdBulkError } from './utils';
import { transformValidateBulkError } from './validate';
import { transformBulkError, buildSiemResponse, createBulkErrorObject } from '../utils';
import { updateRules } from '../../rules/update_rules';
import { updateRulesNotifications } from '../../rules/update_rules_notifications';
import { ruleStatusSavedObjectsClientFactory } from '../../signals/rule_status_saved_objects_client';
import { PartialFilter } from '../../types';

export const updateRulesBulkRoute = (router: IRouter, ml: SetupPlugins['ml']) => {
  router.put(
    {
      path: `${DETECTION_ENGINE_RULES_URL}/_bulk_update`,
      validate: {
        body: buildRouteValidation<typeof updateRulesBulkSchema, UpdateRulesBulkSchemaDecoded>(
          updateRulesBulkSchema
        ),
      },
      options: {
        tags: ['access:securitySolution'],
      },
    },
    async (context, request, response) => {
      const siemResponse = buildSiemResponse(response);

      const alertsClient = context.alerting?.getAlertsClient();
      const savedObjectsClient = context.core.savedObjects.client;
      const siemClient = context.securitySolution?.getAppClient();

      if (!siemClient || !alertsClient) {
        return siemResponse.error({ statusCode: 404 });
      }

      const mlAuthz = buildMlAuthz({ license: context.licensing.license, ml, request });
      const ruleStatusClient = ruleStatusSavedObjectsClientFactory(savedObjectsClient);
      const rules = await Promise.all(
        request.body.map(async (payloadRule) => {
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
            throttle,
            timestamp_override: timestampOverride,
            references,
            note,
            version,
            exceptions_list: exceptionsList,
          } = payloadRule;
          const finalIndex = outputIndex ?? siemClient.getSignalsIndex();
          const idOrRuleIdOrUnknown = id ?? ruleId ?? '(unknown id)';
          try {
            const validationErrors = updateRuleValidateTypeDependents(payloadRule);
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

            const rule = await updateRules({
              alertsClient,
              anomalyThreshold,
              author,
              buildingBlockType,
              description,
              enabled,
              falsePositives,
              from,
              query,
              language,
              license,
              machineLearningJobId,
              outputIndex: finalIndex,
              savedId,
              savedObjectsClient,
              timelineId,
              timelineTitle,
              meta,
              filters,
              id,
              ruleId,
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
              timestampOverride,
              references,
              note,
              version,
              exceptionsList,
              actions,
            });
            if (rule != null) {
              const ruleActions = await updateRulesNotifications({
                ruleAlertId: rule.id,
                alertsClient,
                savedObjectsClient,
                enabled,
                actions,
                throttle,
                name,
              });
              const ruleStatuses = await ruleStatusClient.find({
                perPage: 1,
                sortField: 'statusDate',
                sortOrder: 'desc',
                search: rule.id,
                searchFields: ['alertId'],
              });
              return transformValidateBulkError(
                rule.id,
                rule,
                ruleActions,
                ruleStatuses.saved_objects[0]
              );
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
