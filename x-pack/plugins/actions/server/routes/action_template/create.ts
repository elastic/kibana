/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { IRouter } from '@kbn/core/server';
import { ActionsRequestHandlerContext } from '../../types';
import { ILicenseState, validateEmptyStrings } from '../../lib';
import {
  INTERNAL_BASE_ACTION_API_PATH,
  RewriteRequestCase,
  RewriteResponseCase,
} from '../../../common';
import { verifyAccessAndContext } from '../verify_access_and_context';
import { ActionTemplate, CreateOptions } from '../../lib/action_template_client';

export const bodySchema = schema.object({
  name: schema.string({ validate: validateEmptyStrings }),
  template: schema.string({ validate: validateEmptyStrings }),
  connector_type_id: schema.string({ validate: validateEmptyStrings }),
  connector_id: schema.maybe(schema.string({ validate: validateEmptyStrings })),
});

const rewriteBodyReq: RewriteRequestCase<CreateOptions> = ({
  connector_type_id: connectorTypeId,
  connector_id: connectorId,
  template,
  name,
}) => ({ connectorTypeId, connectorId, template, name });

const rewriteBodyRes: RewriteResponseCase<ActionTemplate> = ({
  connectorTypeId,
  connectorId,
  template,
  name,
}) => ({
  name,
  connector_type_id: connectorTypeId,
  connector_id: connectorId,
  template,
});

export const createActionTemplateRoute = (
  router: IRouter<ActionsRequestHandlerContext>,
  licenseState: ILicenseState
) => {
  router.post(
    {
      path: `${INTERNAL_BASE_ACTION_API_PATH}/template`,
      validate: {
        body: bodySchema,
      },
    },
    router.handleLegacyErrors(
      verifyAccessAndContext(licenseState, async function (context, req, res) {
        const actionTemplateClient = (await context.actions).getActionTemplateClient();
        const actionTemplate = rewriteBodyReq(req.body);
        return res.ok({
          body: rewriteBodyRes(await actionTemplateClient.create(actionTemplate)),
        });
      })
    )
  );
};
