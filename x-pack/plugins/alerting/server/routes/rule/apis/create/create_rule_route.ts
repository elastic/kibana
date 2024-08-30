/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RuleTypeDisabledError } from '../../../../lib';
import {
  handleDisabledApiKeysError,
  verifyAccessAndContext,
  countUsageOfPredefinedIds,
} from '../../../lib';
import { BASE_ALERTING_API_PATH } from '../../../../types';
import { RouteOptions } from '../../..';
import type {
  CreateRuleRequestBodyV1,
  CreateRuleRequestParamsV1,
  CreateRuleResponseV1,
} from '../../../schemas/rule/apis/create';
import { createBodySchemaV1, createParamsSchemaV1 } from '../../../schemas/rule/apis/create';
import { RuleParamsV1, ruleResponseSchemaV1 } from '../../../schemas/rule/response';
import { Rule } from '../../../../application/rule/types';
import { transformCreateBodyV1 } from './transforms';
import { transformRuleToRuleResponseV1 } from '../../transforms';
import { validateRequiredGroupInDefaultActionsV1 } from '../../validation';

export const createRuleRoute = ({ router, licenseState, usageCounter }: RouteOptions) => {
  router.post(
    {
      path: `${BASE_ALERTING_API_PATH}/rule/{id?}`,
      options: {
        access: 'public',
        summary: `Create a rule`,
        tags: ['oas-tag:alerting'],
      },
      validate: {
        request: {
          body: createBodySchemaV1,
          params: createParamsSchemaV1,
        },
        response: {
          200: {
            body: () => ruleResponseSchemaV1,
            description: 'Indicates a successful call.',
          },
        },
      },
    },
    handleDisabledApiKeysError(
      router.handleLegacyErrors(
        verifyAccessAndContext(licenseState, async function (context, req, res) {
          const rulesClient = (await context.alerting).getRulesClient();
          const actionsClient = (await context.actions).getActionsClient();

          // Assert versioned inputs
          const createRuleData: CreateRuleRequestBodyV1<RuleParamsV1> = req.body;
          const params: CreateRuleRequestParamsV1 = req.params;

          countUsageOfPredefinedIds({
            predefinedId: params?.id,
            spaceId: rulesClient.getSpaceId(),
            usageCounter,
          });

          try {
            /**
             * Throws an error if the group is not defined in default actions
             */
            const { actions: allActions = [] } = createRuleData;
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
            const createdRule: Rule<RuleParamsV1> = (await rulesClient.create<RuleParamsV1>({
              data: transformCreateBodyV1<RuleParamsV1>({
                createBody: createRuleData,
                actions,
                systemActions,
              }),
              options: { id: params?.id },
            })) as Rule<RuleParamsV1>;

            // Assert versioned response type
            const response: CreateRuleResponseV1<RuleParamsV1> = {
              body: transformRuleToRuleResponseV1<RuleParamsV1>(createdRule),
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
