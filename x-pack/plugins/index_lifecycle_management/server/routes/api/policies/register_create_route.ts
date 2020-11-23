/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { ElasticsearchClient } from 'kibana/server';

import { RouteDependencies } from '../../../types';
import { addBasePath } from '../../../services';

async function createPolicy(client: ElasticsearchClient, name: string, phases: any): Promise<any> {
  const body = {
    policy: {
      phases,
    },
  };
  const options = {
    ignore: [404],
  };

  return client.ilm.putLifecycle({ policy: name, body }, options);
}

const minAgeSchema = schema.maybe(schema.string());

const setPrioritySchema = schema.maybe(
  schema.object({
    priority: schema.nullable(schema.number()),
  })
);

const unfollowSchema = schema.maybe(schema.object({})); // Unfollow has no options

const migrateSchema = schema.maybe(schema.object({ enabled: schema.literal(false) }));

const allocateNodeSchema = schema.maybe(schema.recordOf(schema.string(), schema.string()));
const allocateSchema = schema.maybe(
  schema.object({
    number_of_replicas: schema.maybe(schema.number()),
    include: allocateNodeSchema,
    exclude: allocateNodeSchema,
    require: allocateNodeSchema,
  })
);

const shrinkActionSchema = schema.object({
  number_of_shards: schema.number(),
});

const forcemergeSchema = schema.maybe(
  schema.object({
    max_num_segments: schema.number(),
    index_codec: schema.maybe(schema.literal('best_compression')),
  })
);

const hotPhaseSchema = schema.object({
  min_age: minAgeSchema,
  actions: schema.object({
    set_priority: setPrioritySchema,
    unfollow: unfollowSchema,
    rollover: schema.maybe(
      schema.object({
        max_age: schema.maybe(schema.string()),
        max_size: schema.maybe(schema.string()),
        max_docs: schema.maybe(schema.number()),
      })
    ),
    forcemerge: forcemergeSchema,
    shrink: schema.maybe(shrinkActionSchema),
  }),
});

const warmPhaseSchema = schema.maybe(
  schema.object({
    min_age: minAgeSchema,
    actions: schema.object({
      migrate: migrateSchema,
      set_priority: setPrioritySchema,
      unfollow: unfollowSchema,
      readonly: schema.maybe(schema.object({})), // Readonly has no options
      allocate: allocateSchema,
      shrink: schema.maybe(shrinkActionSchema),
      forcemerge: forcemergeSchema,
    }),
  })
);

const coldPhaseSchema = schema.maybe(
  schema.object({
    min_age: minAgeSchema,
    actions: schema.object({
      migrate: migrateSchema,
      set_priority: setPrioritySchema,
      unfollow: unfollowSchema,
      allocate: allocateSchema,
      freeze: schema.maybe(schema.object({})), // Freeze has no options
      searchable_snapshot: schema.maybe(
        schema.object({
          snapshot_repository: schema.string(),
        })
      ),
    }),
  })
);

const deletePhaseSchema = schema.maybe(
  schema.object({
    min_age: minAgeSchema,
    actions: schema.object({
      wait_for_snapshot: schema.maybe(
        schema.object({
          policy: schema.string(),
        })
      ),
      delete: schema.maybe(
        schema.object({
          delete_searchable_snapshot: schema.maybe(schema.boolean()),
        })
      ),
    }),
  })
);

// Per https://www.elastic.co/guide/en/elasticsearch/reference/current/_actions.html
const bodySchema = schema.object({
  name: schema.string(),
  phases: schema.object({
    hot: hotPhaseSchema,
    warm: warmPhaseSchema,
    cold: coldPhaseSchema,
    delete: deletePhaseSchema,
  }),
});

export function registerCreateRoute({
  router,
  license,
  lib: { handleEsError },
}: RouteDependencies) {
  router.post(
    { path: addBasePath('/policies'), validate: { body: bodySchema } },
    license.guardApiRoute(async (context, request, response) => {
      const body = request.body as typeof bodySchema.type;
      const { name, phases } = body;

      try {
        await createPolicy(context.core.elasticsearch.client.asCurrentUser, name, phases);
        return response.ok();
      } catch (error) {
        return handleEsError({ error, response });
      }
    })
  );
}
