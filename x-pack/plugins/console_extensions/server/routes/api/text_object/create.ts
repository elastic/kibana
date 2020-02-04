/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema, TypeOf } from '@kbn/config-schema';
import { RequestHandler } from 'kibana/server';
import { APP } from '../../../../common/constants';
import { TEXT_OBJECT } from './constants';
import { RouteDependencies, AuthcHandlerArgs } from './types';
import { withCurrentUsername } from './with_current_username';
import { TextObject } from '../../../../../../../src/plugins/console/common/text_object';

const routeValidation = {
  body: schema.object({
    createdAt: schema.number(),
    updatedAt: schema.number(),
    text: schema.string(),
  }),
};

type CreateRouteValidation = TypeOf<typeof routeValidation>;

export const createHandler = ({
  getInternalSavedObjectsClient,
  username,
}: AuthcHandlerArgs): RequestHandler<unknown, unknown, CreateRouteValidation> => async (
  ctx,
  request,
  response
) => {
  const client = getInternalSavedObjectsClient();
  const {
    attributes: { userId, ...restOfAttributes },
    id,
  } = await client.create(TEXT_OBJECT.type, {
    userId: username,
    ...request.body,
  });
  return response.ok({ body: { id, ...restOfAttributes } });
};

export const registerCreateRoute = ({
  router,
  authc,
  getInternalSavedObjectsClient,
}: RouteDependencies) => {
  router.post(
    { path: `${APP.apiPathBase}/text_objects/create`, validate: routeValidation },
    withCurrentUsername({
      authc,
      passThroughDeps: { getInternalSavedObjectsClient },
      userHandler: createHandler,
    })
  );
};
