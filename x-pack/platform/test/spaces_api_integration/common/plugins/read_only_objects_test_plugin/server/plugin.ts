/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { CoreSetup, Plugin } from '@kbn/core/server';

export const READ_ONLY_TYPE = 'read_only_type';
export const NON_READ_ONLY_TYPE = 'non_read_only_type';

export class ReadOnlyObjectsPlugin implements Plugin {
  public setup(core: CoreSetup) {
    core.savedObjects.registerType({
      name: READ_ONLY_TYPE,
      hidden: false,
      namespaceType: 'multiple-isolated',
      supportsAccessControl: true,
      mappings: {
        dynamic: false,
        properties: {
          description: { type: 'text' },
        },
      },
      management: {
        importableAndExportable: true,
      },
    });

    core.savedObjects.registerType({
      name: NON_READ_ONLY_TYPE,
      hidden: false,
      namespaceType: 'multiple-isolated',
      mappings: {
        dynamic: false,
        properties: {
          description: { type: 'text' },
        },
      },
      management: {
        importableAndExportable: true,
      },
    });

    const router = core.http.createRouter();

    router.post(
      {
        path: '/read_only_objects/create',
        security: {
          authz: {
            enabled: false,
            reason: 'This route is opted out from authorization',
          },
        },
        validate: {
          body: schema.object({
            type: schema.maybe(
              schema.oneOf([schema.literal(READ_ONLY_TYPE), schema.literal(NON_READ_ONLY_TYPE)])
            ),
            isReadOnly: schema.maybe(schema.boolean()),
          }),
        },
      },
      async (context, request, response) => {
        const soClient = (await context.core).savedObjects.getClient();
        const objType = request.body.type || READ_ONLY_TYPE;
        const { isReadOnly } = request.body;

        const options = isReadOnly ? { accessControl: { accessMode: 'read_only' as const } } : {};
        try {
          const result = await soClient.create(
            objType,
            {
              description: 'test',
            },
            options
          );

          return response.ok({
            body: result,
          });
        } catch (error) {
          return response.customError({
            statusCode: 400,
            body: error.message,
          });
        }
      }
    );
    router.get(
      {
        path: '/read_only_objects/_find',
        security: {
          authz: {
            enabled: false,
            reason: 'This route is opted out from authorization',
          },
        },
        validate: false,
      },
      async (context, request, response) => {
        const soClient = (await context.core).savedObjects.client;
        const result = await soClient.find({
          type: READ_ONLY_TYPE,
        });
        return response.ok({
          body: result,
        });
      }
    );
    router.get(
      {
        path: '/read_only_objects/{objectId}',
        security: {
          authz: {
            enabled: false,
            reason: 'This route is opted out from authorization',
          },
        },
        validate: {
          params: schema.object({
            objectId: schema.string(),
          }),
        },
      },
      async (context, request, response) => {
        try {
          const soClient = (await context.core).savedObjects.client;
          const result = await soClient.get(READ_ONLY_TYPE, request.params.objectId);
          return response.ok({
            body: result,
          });
        } catch (error) {
          if (error.output && error.output.statusCode === 404) {
            return response.notFound({
              body: error.message,
            });
          }
          return response.forbidden({
            body: error.message,
          });
        }
      }
    );
    router.put(
      {
        path: '/read_only_objects/update',
        security: {
          authz: {
            enabled: false,
            reason: 'This route is opted out from authorization',
          },
        },
        validate: {
          body: schema.object({
            type: schema.oneOf([
              schema.literal(READ_ONLY_TYPE),
              schema.literal(NON_READ_ONLY_TYPE),
            ]),
            objectId: schema.string(),
          }),
        },
      },
      async (context, request, response) => {
        const soClient = (await context.core).savedObjects.client;
        try {
          const objectType = request.body.type || READ_ONLY_TYPE;
          const result = await soClient.update(objectType, request.body.objectId, {
            description: 'updated description',
          });

          return response.ok({
            body: result,
          });
        } catch (error) {
          return response.forbidden({
            body: error.message,
          });
        }
      }
    );
    router.put(
      {
        path: '/read_only_objects/transfer',
        security: {
          authz: {
            enabled: false,
            reason: 'This route is opted out from authorization',
          },
        },
        validate: {
          body: schema.object({
            newOwnerProfileUid: schema.string(),
            objects: schema.arrayOf(
              schema.object({
                type: schema.oneOf([
                  schema.literal(READ_ONLY_TYPE),
                  schema.literal(NON_READ_ONLY_TYPE),
                ]),
                id: schema.string(),
              })
            ),
          }),
        },
      },
      async (context, request, response) => {
        const soClient = (await context.core).savedObjects.client;

        try {
          const result = await soClient.changeOwnership(request.body.objects, {
            newOwnerProfileUid: request.body.newOwnerProfileUid,
          });
          return response.ok({
            body: result,
          });
        } catch (error) {
          return response.forbidden({
            body: error.message,
          });
        }
      }
    );
    router.put(
      {
        path: '/read_only_objects/change_access_mode',
        security: {
          authz: {
            enabled: false,
            reason: 'This route is opted out from authorization',
          },
        },
        validate: {
          body: schema.object({
            objects: schema.arrayOf(
              schema.object({
                id: schema.string(),
                type: schema.oneOf([
                  schema.literal(READ_ONLY_TYPE),
                  schema.literal(NON_READ_ONLY_TYPE),
                ]),
              })
            ),
            newAccessMode: schema.oneOf([schema.literal('read_only'), schema.literal('default')]),
          }),
        },
      },
      async (context, request, response) => {
        const soClient = (await context.core).savedObjects.client;
        try {
          const result = await soClient.changeAccessMode(request.body.objects, {
            accessMode: request.body.newAccessMode,
          });
          return response.ok({
            body: result,
          });
        } catch (error) {
          return response.forbidden({
            body: error.message,
          });
        }
      }
    );
    router.delete(
      {
        path: '/read_only_objects/{objectId}',
        security: {
          authz: {
            enabled: false,
            reason: 'This route is opted out from authorization',
          },
        },
        validate: {
          params: schema.object({
            objectId: schema.string(),
          }),
        },
      },
      async (context, request, response) => {
        try {
          const soClient = (await context.core).savedObjects.client;
          const result = await soClient.delete(READ_ONLY_TYPE, request.params.objectId);
          return response.ok({
            body: result,
          });
        } catch (error) {
          return response.badRequest({
            body: error.message,
          });
        }
      }
    );

    // non read only routes
    router.get(
      {
        path: '/non_read_only_objects/{objectId}',
        security: {
          authz: {
            enabled: false,
            reason: 'This route is opted out from authorization',
          },
        },
        validate: {
          params: schema.object({
            objectId: schema.string(),
          }),
        },
      },
      async (context, request, response) => {
        try {
          const soClient = (await context.core).savedObjects.client;
          const result = await soClient.get(NON_READ_ONLY_TYPE, request.params.objectId);
          return response.ok({
            body: result,
          });
        } catch (error) {
          if (error.output && error.output.statusCode === 404) {
            return response.notFound({
              body: error.message,
            });
          }
          return response.forbidden({
            body: error.message,
          });
        }
      }
    );
    router.get(
      {
        path: '/non_read_only_objects/_find',
        security: {
          authz: {
            enabled: false,
            reason: 'This route is opted out from authorization',
          },
        },
        validate: false,
      },
      async (context, request, response) => {
        const soClient = (await context.core).savedObjects.client;
        const result = await soClient.find({
          type: NON_READ_ONLY_TYPE,
        });
        return response.ok({
          body: result,
        });
      }
    );
  }
  public start() {}
}
