/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { rulesBulkSchema } from '../../../../../common/detection_engine/schemas/response/rules_bulk_schema';
import { IRouter } from '../../../../../../../../src/core/server';
import { DETECTION_ENGINE_RULES_URL } from '../../../../../common/constants';
import { SetupPlugins } from '../../../../plugin';
import { buildMlAuthz } from '../../../machine_learning/authz';
import { throwHttpError } from '../../../machine_learning/validation';
import { UpdateRuleAlertParamsRest } from '../../rules/types';
import { getIdBulkError } from './utils';
import { transformValidateBulkError, validate } from './validate';
import { buildRouteValidation, transformBulkError, buildSiemResponse } from '../utils';
import { updateRulesBulkSchema } from '../schemas/update_rules_bulk_schema';
import { updateRules } from '../../rules/update_rules';
import { updateRulesNotifications } from '../../rules/update_rules_notifications';
import { ruleStatusSavedObjectsClientFactory } from '../../signals/rule_status_saved_objects_client';

export const updateRulesBulkRoute = (router: IRouter, ml: SetupPlugins['ml']) => {
  router.put(
    {
      path: `${DETECTION_ENGINE_RULES_URL}/_bulk_update`,
      validate: {
        body: buildRouteValidation<UpdateRuleAlertParamsRest[]>(updateRulesBulkSchema),
      },
      options: {
        tags: ['access:siem'],
      },
    },
    async (context, request, response) => {
      const siemResponse = buildSiemResponse(response);

      const alertsClient = context.alerting?.getAlertsClient();
      const savedObjectsClient = context.core.savedObjects.client;
      const siemClient = context.siem?.getSiemClient();

      if (!siemClient || !alertsClient) {
        return siemResponse.error({ statusCode: 404 });
      }

      const mlAuthz = buildMlAuthz({ license: context.licensing.license, ml, request });
      const ruleStatusClient = ruleStatusSavedObjectsClientFactory(savedObjectsClient);
      const rules = await Promise.all(
        request.body.map(async (payloadRule) => {
          const {
            actions,
            anomaly_threshold: anomalyThreshold,
            description,
            enabled,
            false_positives: falsePositives,
            from,
            query,
            language,
            machine_learning_job_id: machineLearningJobId,
            output_index: outputIndex,
            saved_id: savedId,
            timeline_id: timelineId,
            timeline_title: timelineTitle,
            meta,
            filters,
            rule_id: ruleId,
            id,
            index,
            interval,
            max_signals: maxSignals,
            risk_score: riskScore,
            name,
            severity,
            tags,
            to,
            type,
            threat,
            throttle,
            references,
            note,
            version,
            exceptions_list,
          } = payloadRule;
          const finalIndex = outputIndex ?? siemClient.getSignalsIndex();
          const idOrRuleIdOrUnknown = id ?? ruleId ?? '(unknown id)';
          try {
            throwHttpError(await mlAuthz.validateRuleType(type));

            const rule = await updateRules({
              alertsClient,
              anomalyThreshold,
              description,
              enabled,
              falsePositives,
              from,
              query,
              language,
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
              name,
              severity,
              tags,
              to,
              type,
              threat,
              references,
              note,
              version,
              exceptions_list,
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
