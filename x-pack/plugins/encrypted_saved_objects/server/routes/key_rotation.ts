/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { RouteDefinitionParams } from '.';

/**
 * The default maximum value of from + size for searches to .kibana index. Since we cannot use scroll
 * or search_after functionality with the .kibana index we limit maximum batch size with this value.
 */
const DEFAULT_MAX_RESULT_WINDOW = 10000;

/**
 * Defines routes that are used for encryption key rotation.
 */
export function defineKeyRotationRoutes({
  encryptionKeyRotationService,
  router,
  logger,
}: RouteDefinitionParams) {
  router.post(
    {
      path: '/api/encrypted_saved_objects/rotate_key',
      validate: {
        query: schema.object({
          batchSize: schema.number({
            min: 1,
            max: DEFAULT_MAX_RESULT_WINDOW,
            defaultValue: DEFAULT_MAX_RESULT_WINDOW,
          }),
          type: schema.maybe(schema.string()),
        }),
      },
      options: {
        tags: ['access:rotateEncryptionKey'],
      },
    },
    async (context, request, response) => {
      try {
        return response.ok({
          body: await encryptionKeyRotationService.rotate(request, {
            batchSize: request.query.batchSize,
            type: request.query.type,
          }),
        });
      } catch (err) {
        logger.error(err);
        return response.internalError();
      }
    }
  );
}
