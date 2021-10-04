/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { filter, map, reduce } from 'lodash';
import { schema } from '@kbn/config-schema';
import { PLUGIN_ID } from '../../../common';

import { AGENT_POLICY_SAVED_OBJECT_TYPE } from '../../../../fleet/common';
import { IRouter } from '../../../../../../src/core/server';
import { packSavedObjectType } from '../../../common/types';
import { OsqueryAppContext } from '../../lib/osquery_app_context_services';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const readPackRoute = (router: IRouter, osqueryContext: OsqueryAppContext) => {
  router.get(
    {
      path: '/internal/osquery/packs/{id}',
      validate: {
        params: schema.object(
          {
            id: schema.string(),
          },
          { unknowns: 'allow' }
        ),
      },
      options: { tags: [`access:${PLUGIN_ID}-readPacks`] },
    },
    async (context, request, response) => {
      const savedObjectsClient = context.core.savedObjects.client;

      const { attributes, references, ...rest } = await savedObjectsClient.get<{
        name: string;
        description: string;
        queries: Array<{
          id: string;
          name: string;
          interval: string;
          ecs_mapping: Record<string, any>;
        }>;
      }>(packSavedObjectType, request.params.id);

      const policyIds = map(filter(references, ['type', AGENT_POLICY_SAVED_OBJECT_TYPE]), 'id');

      return response.ok({
        body: {
          ...rest,
          ...attributes,
          queries: reduce(
            attributes.queries,
            // eslint-disable-next-line @typescript-eslint/naming-convention
            (acc, { id: queryId, ecs_mapping, ...query }) => {
              acc[queryId] = {
                ...query,
                ecs_mapping: reduce(
                  ecs_mapping,
                  (acc2, { value, field }) => {
                    acc2[value] = {
                      field,
                    };
                    return acc2;
                  },
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  {} as Record<string, any>
                ),
              };
              return acc;
            },
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            {} as Record<string, any>
          ),
          policy_ids: policyIds,
        },
      });
    }
  );
};
