/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { z } from '@kbn/zod';
import { IRouter } from '@kbn/core/server';
import { ActionResult, ActionsRequestHandlerContext } from '../types';
import { ILicenseState } from '../lib';
import { BASE_ACTION_API_PATH, RewriteRequestCase, RewriteResponseCase } from '../../common';
import { verifyAccessAndContext } from './verify_access_and_context';
import { CreateOptions } from '../actions_client';

// The below zod declarations could be shared between endpoints
const nonEmptyString = z.string().trim().nonempty();

const configValue = z.union([
  z.record(z.string(), nonEmptyString),
  z.array(nonEmptyString),
  z.boolean(),
  nonEmptyString,
]);
const recordOfStringObjectOrArray = z.record(z.string(), configValue.default({}));

const response = z.object({
  actionTypeId: nonEmptyString,
  name: nonEmptyString,
  config: recordOfStringObjectOrArray,
  secrets: recordOfStringObjectOrArray,
});

const createConnectorParams = z
  .object({
    id: z.string().default(''),
  })
  .optional();

export const bodySchema = z.object({
  name: nonEmptyString,
  connector_type_id: nonEmptyString,
  config: recordOfStringObjectOrArray,
  secrets: recordOfStringObjectOrArray,
});

// We should be able to share this between all routes
const versionDate = '2023-10-31';

// End of shareable schemas

const rewriteBodyReq: RewriteRequestCase<CreateOptions['action']> = ({
  connector_type_id: actionTypeId,
  name,
  config,
  secrets,
}) => ({ actionTypeId, name, config, secrets });
const rewriteBodyRes: RewriteResponseCase<ActionResult> = ({
  actionTypeId,
  isPreconfigured,
  isDeprecated,
  isMissingSecrets,
  ...res
}) => ({
  ...res,
  connector_type_id: actionTypeId,
  is_preconfigured: isPreconfigured,
  is_deprecated: isDeprecated,
  is_missing_secrets: isMissingSecrets,
});

export const createActionRoute = (
  router: IRouter<ActionsRequestHandlerContext>,
  licenseState: ILicenseState
) => {
  router.versioned
    .post({
      path: `${BASE_ACTION_API_PATH}/connector/{id?}`,
      access: 'public',
      description: 'Creates an action connector.',
    })
    .addVersion(
      {
        version: versionDate,
        validate: {
          request: {
            params: createConnectorParams,
            body: bodySchema,
          },
          response: {
            200: {
              body: response,
            },
          },
        },
      },
      router.handleLegacyErrors(
        verifyAccessAndContext(licenseState, async function (context, req, res) {
          const actionsClient = (await context.actions).getActionsClient();
          const action = rewriteBodyReq(req.body);
          return res.ok({
            body: rewriteBodyRes(await actionsClient.create({ action, options: req.params })),
          });
        })
      )
    );
};
