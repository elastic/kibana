/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { IRouter } from 'src/core/server';
import { AssignmentError } from '../../services';

export const registerUpdateTagsAssignmentsRoute = (router: IRouter) => {
  const objectReferenceSchema = schema.object({
    type: schema.string(),
    id: schema.string(),
  });

  router.post(
    {
      path: '/api/saved_objects_tagging/assignments/update_by_tags',
      validate: {
        body: schema.object(
          {
            tags: schema.arrayOf(schema.string(), { minSize: 1 }),
            assign: schema.maybe(schema.arrayOf(objectReferenceSchema)),
            unassign: schema.maybe(schema.arrayOf(objectReferenceSchema)),
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
      try {
        const { assignmentService } = ctx.tags!;
        const { tags, assign, unassign } = req.body;

        await assignmentService.updateTagAssignments({
          tags,
          assign: assign ?? [],
          unassign: unassign ?? [],
        });

        return res.ok({
          body: {},
        });
      } catch (e) {
        if (e instanceof AssignmentError) {
          return res.customError({
            statusCode: e.status,
            body: e.message,
          });
        }
        throw e;
      }
    })
  );
};
