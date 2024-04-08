/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IRouter } from '@kbn/core/server';

import { ILicenseState, RuleTypeDisabledError } from '../../../../lib';
import { verifyAccessAndContext, handleDisabledApiKeysError } from '../../../lib';
import { AlertingRequestHandlerContext, INTERNAL_BASE_ALERTING_API_PATH } from '../../../../types';

import {
  bulkEditRulesRequestBodySchemaV1,
  BulkEditRulesRequestBodyV1,
  BulkEditRulesResponseV1,
} from '../../../../../common/routes/rule/apis/bulk_edit';
import { Rule } from '../../../../application/rule/types';
import type { RuleParamsV1 } from '../../../../../common/routes/rule/response';

import { transformRuleToRuleResponseV1 } from '../../transforms';
import { transformOperationsV1 } from './transforms';
import { validateRequiredGroupInDefaultActions } from '../../../lib/validate_required_group_in_default_actions';

interface BuildBulkEditRulesRouteParams {
  licenseState: ILicenseState;
  path: string;
  router: IRouter<AlertingRequestHandlerContext>;
}

const buildBulkEditRulesRoute = ({ licenseState, path, router }: BuildBulkEditRulesRouteParams) => {
  router.post(
    {
      path,
      validate: {
        body: bulkEditRulesRequestBodySchemaV1,
      },
    },
    handleDisabledApiKeysError(
      router.handleLegacyErrors(
        verifyAccessAndContext(licenseState, async function (context, req, res) {
          const rulesClient = (await context.alerting).getRulesClient();
          const actionsClient = (await context.actions).getActionsClient();

          const bulkEditData: BulkEditRulesRequestBodyV1 = req.body;
          const { filter, operations, ids } = bulkEditData;

          try {
            validateRequiredGroupInDefaultActionsInOperations(
              operations ?? [],
              (connectorId: string) => actionsClient.isSystemAction(connectorId)
            );

            const bulkEditResults = await rulesClient.bulkEdit<RuleParamsV1>({
              filter,
              ids,
              operations: transformOperationsV1({
                operations,
                isSystemAction: (connectorId: string) => actionsClient.isSystemAction(connectorId),
              }),
            });

            const resultBody: BulkEditRulesResponseV1<RuleParamsV1> = {
              body: {
                ...bulkEditResults,
                rules: bulkEditResults.rules.map((rule) => {
                  // TODO (http-versioning): Remove this cast, this enables us to move forward
                  // without fixing all of other solution types
                  return transformRuleToRuleResponseV1<RuleParamsV1>(rule as Rule<RuleParamsV1>);
                }),
              },
            };
            return res.ok(resultBody);
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

export const bulkEditInternalRulesRoute = (
  router: IRouter<AlertingRequestHandlerContext>,
  licenseState: ILicenseState
) =>
  buildBulkEditRulesRoute({
    licenseState,
    path: `${INTERNAL_BASE_ALERTING_API_PATH}/rules/_bulk_edit`,
    router,
  });

const validateRequiredGroupInDefaultActionsInOperations = (
  operations: BulkEditRulesRequestBodyV1['operations'],
  isSystemAction: (connectorId: string) => boolean
) => {
  for (const operation of operations) {
    if (operation.field === 'actions') {
      validateRequiredGroupInDefaultActions(operation.value, isSystemAction);
    }
  }
};
