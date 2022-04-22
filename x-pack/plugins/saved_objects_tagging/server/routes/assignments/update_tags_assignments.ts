/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { TagsPluginRouter } from '../../types';
import { AssignmentError } from '../../services';

export const registerUpdateTagsAssignmentsRoute = (router: TagsPluginRouter) => {
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
            assign: schema.arrayOf(objectReferenceSchema, { defaultValue: [] }),
            unassign: schema.arrayOf(objectReferenceSchema, { defaultValue: [] }),
          },
          {
            validate: ({ assign, unassign }) => {
              if (assign.length === 0 && unassign.length === 0) {
                return 'either `assign` or `unassign` must be specified';
              }
            },
          }
        ),
      },
    },
    router.handleLegacyErrors(async (ctx, req, res) => {
      try {
        const { assignmentService } = await ctx.tags;
        const { tags, assign, unassign } = req.body;

        await assignmentService.updateTagAssignments({
          tags,
          assign,
          unassign,
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
