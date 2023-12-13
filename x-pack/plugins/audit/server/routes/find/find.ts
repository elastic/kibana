/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IRouter } from '@kbn/core/server';
import { AUDIT_FIND_PATH } from '../../../common';
import { transformFindRequestV1, transformFindResponseV1 } from './transforms';
import { findAuditBodySchemaV1 } from '../../../common/routes/audit/apis/find';
import { AuditRequestHandlerContext } from '../../types';

export const findAuditRoute = (router: IRouter<AuditRequestHandlerContext>) => {
  router.post(
    {
      path: AUDIT_FIND_PATH,
      validate: {
        body: findAuditBodySchemaV1,
      },
    },
    router.handleLegacyErrors(async function (context, req, res) {
      // TODO: verify license
      const client = (await context.audit).getAuditClient();
      const result = await client.find(transformFindRequestV1(req.body));
      return res.ok({ body: transformFindResponseV1(result) });
    })
  );
};
