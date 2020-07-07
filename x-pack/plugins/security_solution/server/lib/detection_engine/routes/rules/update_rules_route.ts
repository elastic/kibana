/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { updateRuleValidateTypeDependents } from '../../../../../common/detection_engine/schemas/request/update_rules_type_dependents';
import { RuleAlertAction } from '../../../../../common/detection_engine/types';
import {
  updateRulesSchema,
  UpdateRulesSchemaDecoded,
} from '../../../../../common/detection_engine/schemas/request/update_rules_schema';
import { IRouter } from '../../../../../../../../src/core/server';
import { DETECTION_ENGINE_RULES_URL } from '../../../../../common/constants';
import { SetupPlugins } from '../../../../plugin';
import { buildMlAuthz } from '../../../machine_learning/authz';
import { throwHttpError } from '../../../machine_learning/validation';
import { transformError, buildSiemResponse } from '../utils';
import { getIdError } from './utils';
import { transformValidate } from './validate';
import { updateRules } from '../../rules/update_rules';
import { updateRulesNotifications } from '../../rules/update_rules_notifications';
import { ruleStatusSavedObjectsClientFactory } from '../../signals/rule_status_saved_objects_client';
import { buildRouteValidation } from '../../../../utils/build_validation/route_validation';
import { PartialFilter } from '../../types';

export const updateRulesRoute = (router: IRouter, ml: SetupPlugins['ml']) => {
  router.put(
    {
      path: DETECTION_ENGINE_RULES_URL,
      validate: {
        body: buildRouteValidation<typeof updateRulesSchema, UpdateRulesSchemaDecoded>(
          updateRulesSchema
        ),
      },
      options: {
        tags: ['access:securitySolution'],
      },
    },
    async (context, request, response) => {
      const siemResponse = buildSiemResponse(response);
      const validationErrors = updateRuleValidateTypeDependents(request.body);
      if (validationErrors.length) {
        return siemResponse.error({ statusCode: 400, body: validationErrors });
      }

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
      } = request.body;
      try {
        const query =
          type !== 'machine_learning' && queryOrUndefined == null ? '' : queryOrUndefined;

        const language =
          type !== 'machine_learning' && languageOrUndefined == null
            ? 'kuery'
            : languageOrUndefined;

        // TODO: Fix these either with an is conversion or by better typing them within io-ts
        const actions: RuleAlertAction[] = actionsRest as RuleAlertAction[];
        const filters: PartialFilter[] | undefined = filtersRest as PartialFilter[];

        const alertsClient = context.alerting?.getAlertsClient();
        const savedObjectsClient = context.core.savedObjects.client;
        const siemClient = context.securitySolution?.getAppClient();
        const ruleStatusClient = ruleStatusSavedObjectsClientFactory(savedObjectsClient);

        if (!siemClient || !alertsClient) {
          return siemResponse.error({ statusCode: 404 });
        }

        const mlAuthz = buildMlAuthz({ license: context.licensing.license, ml, request });
        throwHttpError(await mlAuthz.validateRuleType(type));

        const finalIndex = outputIndex ?? siemClient.getSignalsIndex();
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
          actions: throttle === 'rule' ? actions : [], // Only enable actions if throttle is rule, otherwise we are a notification and should not enable it
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
          const [validated, errors] = transformValidate(
            rule,
            ruleActions,
            ruleStatuses.saved_objects[0]
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
