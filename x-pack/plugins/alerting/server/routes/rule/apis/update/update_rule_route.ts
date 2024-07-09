/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IRouter } from '@kbn/core/server';
import { ILicenseState, RuleTypeDisabledError } from '../../../../lib';
import { verifyAccessAndContext, handleDisabledApiKeysError } from '../../../lib';
import type {
  UpdateRuleRequestBodyV1,
  UpdateRuleRequestParamsV1,
  UpdateRuleResponseV1,
} from '../../../../../common/routes/rule/apis/update';
import {
  updateBodySchemaV1,
  updateParamsSchemaV1,
} from '../../../../../common/routes/rule/apis/update';
import type { RuleParamsV1 } from '../../../../../common/routes/rule/response';
import { AlertingRequestHandlerContext, BASE_ALERTING_API_PATH } from '../../../../types';
import { Rule } from '../../../../application/rule/types';
import { transformUpdateBodyV1 } from './transforms';
import { transformRuleToRuleResponseV1 } from '../../transforms';
import { validateRequiredGroupInDefaultActionsV1 } from '../../validation';

export const updateRuleRoute = (
  router: IRouter<AlertingRequestHandlerContext>,
  licenseState: ILicenseState
) => {
  router.put(
    {
      path: `${BASE_ALERTING_API_PATH}/rule/{id}`,
      options: {
        access: 'public',
        summary: `Update a rule`,
      },
      validate: {
        body: updateBodySchemaV1,
        params: updateParamsSchemaV1,
      },
    },
    handleDisabledApiKeysError(
      router.handleLegacyErrors(
        verifyAccessAndContext(licenseState, async function (context, req, res) {
          const rulesClient = (await context.alerting).getRulesClient();
          const actionsClient = (await context.actions).getActionsClient();

          // Assert versioned inputs
          const updateRuleData: UpdateRuleRequestBodyV1<RuleParamsV1> = req.body;
          const updateRuleParams: UpdateRuleRequestParamsV1 = req.params;

          try {
            /**
             * Throws an error if the group is not defined in default actions
             */
            const { actions: allActions = [] } = updateRuleData;
            validateRequiredGroupInDefaultActionsV1({
              actions: allActions,
              isSystemAction: (connectorId: string) => actionsClient.isSystemAction(connectorId),
            });

            const actions = allActions.filter((action) => !actionsClient.isSystemAction(action.id));
            const systemActions = allActions.filter((action) =>
              actionsClient.isSystemAction(action.id)
            );

            // TODO (http-versioning): Remove this cast, this enables us to move forward
            // without fixing all of other solution types
            const updatedRule: Rule<RuleParamsV1> = (await rulesClient.update<RuleParamsV1>({
              id: updateRuleParams.id,
              data: transformUpdateBodyV1<RuleParamsV1>({
                updateBody: updateRuleData,
                actions,
                systemActions,
              }),
            })) as Rule<RuleParamsV1>;

            // Assert versioned response type
            const response: UpdateRuleResponseV1<RuleParamsV1> = {
              body: transformRuleToRuleResponseV1<RuleParamsV1>(updatedRule),
            };

            return res.ok(response);
          } catch (e) {
            if (e instanceof RuleTypeDisabledError) {
              return e.sendResponse(res);
            }
            throw e;
          }
        })
      )
    )
  );
};
