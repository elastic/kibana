/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { RequestHandler } from 'kibana/server';
import { APP } from '../../../../common/constants';
import { TEXT_OBJECT } from './constants';
import { RouteDependencies, HandlerDependencies } from './types';
import { withCurrentUsername } from './with_current_username';
import { TextObjectSchemaWithId, textObjectSchemaWithId } from './text_object';

export const createHandler = ({ getInternalSavedObjectsClient }: HandlerDependencies) => (
  username: string
): RequestHandler<unknown, unknown, TextObjectSchemaWithId> => async (ctx, request, response) => {
  const client = getInternalSavedObjectsClient();
  const { id, ...rest } = request.body;
  try {
    await client.update(TEXT_OBJECT.type, id, {
      userId: username,
      ...rest,
    });
    return response.noContent();
  } catch (e) {
    if (e.output?.statusCode === 404) {
      return response.notFound(e.message);
    }
    return response.internalError(e);
  }
};

export const registerUpdateRoute = ({
  router,
  authc,
  getInternalSavedObjectsClient,
}: RouteDependencies) => {
  router.put(
    {
      path: `${APP.apiPathBase}/text_objects/update`,
      validate: {
        body: textObjectSchemaWithId,
      },
    },
    withCurrentUsername({
      authc,
      handlerFactory: createHandler({ getInternalSavedObjectsClient }),
    })
  );
};
