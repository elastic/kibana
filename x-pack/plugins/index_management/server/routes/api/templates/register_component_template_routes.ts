/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { schema, TypeOf } from '@kbn/config-schema';

import { deserializeTemplateV1List, deserializeTemplateV2List } from '../../../../common/lib';
import { ComponentTemplateSerialized } from '../../../../common/types';
import { RouteDependencies } from '../../../types';
import { addBasePath } from '../index';

export function registerComponentTemplateRoutes({ router, license }: RouteDependencies) {
  router.get(
    { path: addBasePath('/component-templates'), validate: false },
    license.guardApiRoute(async (ctx, req, res) => {
      const { callAsCurrentUser } = ctx.core.elasticsearch.dataClient;
      const { component_templates: componentTemplates } = (await callAsCurrentUser(
        'transport.request',
        {
          path: '_component_template',
          method: 'GET',
        }
      )) as {
        component_templates: Array<{
          name: string;
          component_template: ComponentTemplateSerialized;
        }>;
      };

      const body = componentTemplates
        .map(({ name, component_template: componentTemplate }) => ({
          name,
          ...componentTemplate,
        }))
        .sort((a, b) => {
          if (a.name < b.name) {
            return -1;
          }
          if (a.name > b.name) {
            return 1;
          }

          return 0;
        });
      return res.ok({ body });
    })
  );
}

// const paramsSchema = schema.object({
//   name: schema.string(),
// });

// // Require the template format version (V1 or V2) to be provided as Query param
// const querySchema = schema.object({
//   v: schema.oneOf([schema.literal('1'), schema.literal('2')]),
// });

// export function registerGetOneRoute({ router, license, lib }: RouteDependencies) {
//   router.get(
//     {
//       path: addBasePath('/templates/{name}'),
//       validate: { params: paramsSchema, query: querySchema },
//     },
//     license.guardApiRoute(async (ctx, req, res) => {
//       const { name } = req.params as typeof paramsSchema.type;
//       const { callAsCurrentUser } = ctx.core.elasticsearch.dataClient;

//       const { v: version } = req.query as TypeOf<typeof querySchema>;

//       if (version !== '1') {
//         return res.badRequest({ body: 'Only index template version 1 can be fetched.' });
//       }

//       try {
//         const managedTemplatePrefix = await getManagedTemplatePrefix(callAsCurrentUser);
//         const indexTemplateByName = await callAsCurrentUser('indices.getTemplate', { name });

//         if (indexTemplateByName[name]) {
//           return res.ok({
//             body: deserializeV1Template(
//               { ...indexTemplateByName[name], name },
//               managedTemplatePrefix
//             ),
//           });
//         }

//         return res.notFound();
//       } catch (e) {
//         if (lib.isEsError(e)) {
//           return res.customError({
//             statusCode: e.statusCode,
//             body: e,
//           });
//         }
//         // Case: default
//         return res.internalError({ body: e });
//       }
//     })
//   );
// }
