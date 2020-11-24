/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { IRouter } from 'src/core/server';
import { taggableTypes } from '../../../common/constants';

export const registerUpdateTagsAssignmentsRoute = (router: IRouter) => {
  router.post(
    {
      path: '/api/saved_objects_tagging/assignments/update_by_tags',
      validate: {
        body: schema.object(
          {
            tags: schema.arrayOf(schema.string(), { minSize: 1 }),
            assign: schema.maybe(
              schema.arrayOf(
                schema.object({
                  type: schema.string(),
                  id: schema.string(),
                })
              )
            ),
            unassign: schema.maybe(
              schema.arrayOf(
                schema.object({
                  type: schema.string(),
                  id: schema.string(),
                })
              )
            ),
          },
          {
            validate: ({ assign, unassign }) => {
              if (!assign && !unassign) {
                return 'either `assign` or `unassign` must be specified';
              }
            },
          }
        ),
      },
    },
    router.handleLegacyErrors(async (ctx, req, res) => {
      const { assignmentService } = ctx.tags!;
      const { tags, assign, unassign } = req.body;

      await assignmentService.updateTagAssignments({
        tags,
        assign: assign ?? [],
        unassign: unassign ?? [],
      });

      return res.ok({
        body: { taggableTypes },
      });
    })
  );
};
