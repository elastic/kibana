/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformError } from '@kbn/securitysolution-es-utils';
import { updateRulesSchema } from '../../../../../common/detection_engine/schemas/request';
import { updateRuleValidateTypeDependents } from '../../../../../common/detection_engine/schemas/request/update_rules_type_dependents';
import type { SecuritySolutionPluginRouter } from '../../../../types';
import { DETECTION_ENGINE_RULES_URL } from '../../../../../common/constants';
import { SetupPlugins } from '../../../../plugin';
import { buildMlAuthz } from '../../../machine_learning/authz';
import { throwHttpError } from '../../../machine_learning/validation';
import { buildSiemResponse } from '../utils';

import { getIdError } from './utils';
import { transformValidate } from './validate';
import { updateRules } from '../../rules/update_rules';
import { buildRouteValidation } from '../../../../utils/build_validation/route_validation';
// eslint-disable-next-line no-restricted-imports
import { legacyRuleActionsSavedObjectType } from '../../rule_actions/legacy_saved_object_mappings';

export const updateRulesRoute = (
  router: SecuritySolutionPluginRouter,
  ml: SetupPlugins['ml'],
  isRuleRegistryEnabled: boolean
) => {
  router.put(
    {
      path: DETECTION_ENGINE_RULES_URL,
      validate: {
        body: buildRouteValidation(updateRulesSchema),
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
      try {
        const rulesClient = context.alerting?.getRulesClient();
        const savedObjectsClient = context.core.savedObjects.client;
        const siemClient = context.securitySolution?.getAppClient();

        if (!siemClient || !rulesClient) {
          return siemResponse.error({ statusCode: 404 });
        }

        const mlAuthz = buildMlAuthz({
          license: context.licensing.license,
          ml,
          request,
          savedObjectsClient,
        });
        throwHttpError(await mlAuthz.validateRuleType(request.body.type));

        const ruleStatusClient = context.securitySolution.getExecutionLogClient();
        const rule = await updateRules({
          defaultOutputIndex: siemClient.getSignalsIndex(),
          isRuleRegistryEnabled,
          rulesClient,
          ruleStatusClient,
          ruleUpdate: request.body,
          spaceId: context.securitySolution.getSpaceId(),
        });

        /**
         * ,
            {
              term: {
                'alert.params.ruleAlertId': rule?.id,
              },
            },
         */

        // const thing = await savedObjectsClient.find({
        //   type: 'action',
        // });

        /**
         * On update / patch I'm going to take the actions as they are, better off taking rules client.find (siem.notification) result
         * and putting that into the actions array of the rule, then set the rules onThrottle property, notifyWhen and throttle from null -> actualy value (1hr etc..)
         * Then use the rules client to delete the siem.notification
         * Then with the legacy Rule Actions saved object type, just delete it.
         */

        // find it using the references array, not params.ruleAlertId
        if (rule != null) {
          const siemNotification = await rulesClient.find({
            options: {
              hasReference: {
                type: 'alert',
                id: rule.id,
              },
            },
          });

          const thing2 = await savedObjectsClient.find({ type: legacyRuleActionsSavedObjectType });

          console.error(
            'DID WE FIND THE SIEM NOTIFICATION FOR THIS ALERT?',
            JSON.stringify(siemNotification, null, 2)
          );

          console.error('RULE SIDE CAR', JSON.stringify(thing2, null, 2));

          if (rule?.actions != null) {
            rule.actions = siemNotification.data[0].actions;
            rule.throttle = siemNotification.data[0].schedule.interval;
            rule.notifyWhen = 'onThrottleInterval';
          }
        }

        // use alert.references[] in find filter ^^^

        if (rule != null) {
          const ruleStatuses = await ruleStatusClient.find({
            logsCount: 1,
            ruleId: rule.id,
            spaceId: context.securitySolution.getSpaceId(),
          });
          const [validated, errors] = transformValidate(
            rule,
            ruleStatuses[0],
            isRuleRegistryEnabled
          );
          if (errors != null) {
            return siemResponse.error({ statusCode: 500, body: errors });
          } else {
            return response.ok({ body: validated ?? {} });
          }
        } else {
          const error = getIdError({ id: request.body.id, ruleId: request.body.rule_id });
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
