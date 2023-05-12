/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { IRouter } from '@kbn/core/server';
import { ILicenseState } from '../lib';
import { BASE_ACTION_API_PATH, RewriteResponseCase } from '../../common';
import { ActionsRequestHandlerContext, FindActionResult } from '../types';
import { verifyAccessAndContext } from './verify_access_and_context';

// The below zod declarations could be shared between endpoints

// We should be able to share this between all routes
const versionDate = '2023-10-31';
const getAllConnectorParams = z.object({
  id: z.string(),
});
const connectorTypesEnum = z
  .enum([
    '.cases-webhook',
    '.email',
    '.index',
    '.jira',
    '.opsgenie',
    '.pagerduty',
    '.resilient',
    '.servicenow',
    '.servicenow-itom',
    '.servicenow-sir',
    '.server-log',
    '.slack',
    '.swimlane',
    '.teams',
    '.tines',
    '.webhook',
    '.xmatters',
  ])
  .describe('A unique keyword for each valid connector type.');
const nonEmptyString = z.string().trim().nonempty();
const soAttribute = z.union([z.string(), z.boolean(), z.undefined(), z.number(), z.null()]);
const anyRecord = z.record(
  z.string(),
  z.any({ description: 'Allow any valid, primitive value or object here' })
);
const soObject = z.record(z.string(), soAttribute.or(anyRecord.default({})));

const response = z.array(
  z.object({
    connector_type_id: connectorTypesEnum,
    config: soObject.optional(),
    id: nonEmptyString,
    is_deprecated: z.boolean(),
    is_preconfigured: z.boolean,
    name: nonEmptyString,
    referenced_by_count: z.number,
  })
);
// End of shareable schemas

const rewriteBodyRes: RewriteResponseCase<FindActionResult[]> = (results) => {
  return results.map(
    ({
      actionTypeId,
      isPreconfigured,
      isDeprecated,
      referencedByCount,
      isMissingSecrets,
      ...res
    }) => ({
      ...res,
      connector_type_id: actionTypeId,
      is_preconfigured: isPreconfigured,
      is_deprecated: isDeprecated,
      referenced_by_count: referencedByCount,
      is_missing_secrets: isMissingSecrets,
    })
  );
};

export const getAllActionRoute = (
  router: IRouter<ActionsRequestHandlerContext>,
  licenseState: ILicenseState
) => {
  router.versioned
    .get({
      path: `${BASE_ACTION_API_PATH}/connectors`,
      access: 'public',
      summary: 'Retrieves all connectors.',
    })
    .addVersion(
      {
        version: versionDate,
        validate: {
          request: {
            params: getAllConnectorParams,
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
          const result = await actionsClient.getAll();
          return res.ok({
            body: rewriteBodyRes(result),
          });
        })
      )
    );
};
