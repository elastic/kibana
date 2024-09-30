/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { IRouter } from '@kbn/core/server';
import { schema } from '@kbn/config-schema';
import { AlertingRequestHandlerContext, INTERNAL_BASE_ALERTING_API_PATH } from '../types';
import { RewriteRequestCase, verifyAccessAndContext, rewriteNamespaces } from './lib';
import { GetGlobalExecutionKPIParams } from '../rules_client';
import { ILicenseState } from '../lib';

const querySchema = schema.object({
  date_start: schema.string(),
  date_end: schema.maybe(schema.string()),
  filter: schema.maybe(schema.string()),
  namespaces: schema.maybe(schema.arrayOf(schema.string())),
});

const rewriteReq: RewriteRequestCase<GetGlobalExecutionKPIParams> = ({
  date_start: dateStart,
  date_end: dateEnd,
  namespaces,
  ...rest
}) => ({
  ...rest,
  namespaces: rewriteNamespaces(namespaces),
  dateStart,
  dateEnd,
});

export const getGlobalExecutionKPIRoute = (
  router: IRouter<AlertingRequestHandlerContext>,
  licenseState: ILicenseState
) => {
  router.get(
    {
      path: `${INTERNAL_BASE_ALERTING_API_PATH}/_global_execution_kpi`,
      options: {
        access: 'internal',
      },
      validate: {
        query: querySchema,
      },
    },
    router.handleLegacyErrors(
      verifyAccessAndContext(licenseState, async function (context, req, res) {
        const rulesClient = (await context.alerting).getRulesClient();
        return res.ok({
          body: await rulesClient.getGlobalExecutionKpiWithAuth(rewriteReq(req.query)),
        });
      })
    )
  );
};
