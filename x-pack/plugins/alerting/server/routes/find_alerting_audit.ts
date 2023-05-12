/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IRouter } from '@kbn/core/server';
import { schema } from '@kbn/config-schema';

import { FindOptions } from '../audit/client/methods';
import { ILicenseState } from '../lib';
import { RewriteRequestCase, RewriteResponseCase, verifyAccessAndContext } from './lib';
import {
  ALERTING_AUDIT_FIND_PATH,
  AlertingRequestHandlerContext,
  AlertingAuditLog,
} from '../types';

const bodySchema = schema.object({
  per_page: schema.maybe(schema.number()),
  page: schema.maybe(schema.number()),
  sort_field: schema.maybe(schema.string()),
  sort_order: schema.maybe(schema.oneOf([schema.literal('asc'), schema.literal('desc')])),
  search: schema.maybe(schema.string()),
  fields: schema.maybe(schema.arrayOf(schema.string())),
  filter: schema.maybe(schema.string()),
});

const rewriteBodyReq: RewriteRequestCase<FindOptions> = ({
  per_page: perPage,
  sort_field: sortField,
  sort_order: sortOrder,
  ...rest
}) => ({
  ...rest,
  perPage,
  sortField,
  sortOrder,
});

const rewriteBodyRes: RewriteResponseCase<AlertingAuditLog> = ({ subjectId, ...rest }) => ({
  ...rest,
  subject_id: subjectId,
});

export const findAlertingAuditRoute = (
  router: IRouter<AlertingRequestHandlerContext>,
  licenseState: ILicenseState
) => {
  router.post(
    {
      path: ALERTING_AUDIT_FIND_PATH,
      validate: {
        body: bodySchema,
      },
    },
    router.handleLegacyErrors(
      verifyAccessAndContext(licenseState, async function (context, req, res) {
        licenseState.ensureLicenseForMaintenanceWindow();

        const alertingAuditClient = (await context.alerting).getAlertingAuditClient();
        const result = await alertingAuditClient.find({ options: rewriteBodyReq(req.body) });

        return res.ok({
          body: {
            data: result.data.map((audit) => rewriteBodyRes(audit)),
            total: result.data.length,
          },
        });
      })
    )
  );
};
