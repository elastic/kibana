/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IRouter } from '@kbn/core/server';
import { schema } from '@kbn/config-schema';
import { ILicenseState } from '../lib';
import { ActionsRequestHandlerContext } from '../types';
import {
  GetGlobalExecutionLogParams,
  INTERNAL_BASE_ACTION_API_PATH,
  RewriteRequestCase,
} from '../../common';
import { verifyAccessAndContext } from './verify_access_and_context';
import { rewriteNamespaces } from './rewrite_namespaces';

const sortOrderSchema = schema.oneOf([schema.literal('asc'), schema.literal('desc')]);

const sortFieldSchema = schema.oneOf([
  schema.object({ timestamp: schema.object({ order: sortOrderSchema }) }),
  schema.object({ execution_duration: schema.object({ order: sortOrderSchema }) }),
  schema.object({ schedule_delay: schema.object({ order: sortOrderSchema }) }),
]);

const sortFieldsSchema = schema.arrayOf(sortFieldSchema, {
  defaultValue: [{ timestamp: { order: 'desc' } }],
});

const bodySchema = schema.object({
  date_start: schema.string(),
  date_end: schema.maybe(schema.string()),
  filter: schema.maybe(schema.string()),
  per_page: schema.number({ defaultValue: 10, min: 1 }),
  page: schema.number({ defaultValue: 1, min: 1 }),
  sort: sortFieldsSchema,
  namespaces: schema.maybe(schema.arrayOf(schema.string())),
});

const rewriteBodyReq: RewriteRequestCase<GetGlobalExecutionLogParams> = ({
  date_start: dateStart,
  date_end: dateEnd,
  per_page: perPage,
  namespaces,
  ...rest
}) => ({ ...rest, namespaces: rewriteNamespaces(namespaces), dateStart, dateEnd, perPage });

export const getGlobalExecutionLogRoute = (
  router: IRouter<ActionsRequestHandlerContext>,
  licenseState: ILicenseState
) => {
  router.post(
    {
      path: `${INTERNAL_BASE_ACTION_API_PATH}/_global_connector_execution_logs`,
      validate: {
        body: bodySchema,
      },
      options: {
        access: 'internal',
      },
    },
    router.handleLegacyErrors(
      verifyAccessAndContext(licenseState, async function (context, req, res) {
        const actionsClient = (await context.actions).getActionsClient();
        return res.ok({
          body: await actionsClient.getGlobalExecutionLogWithAuth(rewriteBodyReq(req.body)),
        });
      })
    )
  );
};
