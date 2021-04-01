/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { find } from 'lodash/fp';
import uuid from 'uuid';
import { schema } from '@kbn/config-schema';
import moment from 'moment';

import { IRouter } from '../../../../../../src/core/server';
import { packSavedObjectType, savedQuerySavedObjectType } from '../../../common/types';
import { OsqueryAppContext } from '../../lib/osquery_app_context_services';

import { parseAgentSelection, AgentSelection } from '../../lib/parse_agent_groups';

export const createActionRoute = (router: IRouter, osqueryContext: OsqueryAppContext) => {
  router.post(
    {
      path: '/internal/osquery/action',
      validate: {
        params: schema.object({}, { unknowns: 'allow' }),
        body: schema.object({}, { unknowns: 'allow' }),
      },
    },
    async (context, request, response) => {
      const esClient = context.core.elasticsearch.client.asInternalUser;
      const { agentSelection } = request.body as { agentSelection: AgentSelection };
      const selectedAgents = await parseAgentSelection(esClient, osqueryContext, agentSelection);
      // @ts-expect-error update validation
      if (request.body.pack_id) {
        const savedObjectsClient = context.core.savedObjects.client;
        const { attributes, references, ...rest } = await savedObjectsClient.get<{
          title: string;
          description: string;
          queries: Array<{ name: string; interval: string }>;
        }>(
          packSavedObjectType,
          // @ts-expect-error update types
          request.body.pack_id
        );

        const pack = {
          ...rest,
          ...attributes,
          queries:
            attributes.queries?.map((packQuery) => {
              const queryReference = find(['name', packQuery.name], references);

              if (queryReference) {
                return {
                  ...packQuery,
                  id: queryReference?.id,
                };
              }

              return packQuery;
            }) ?? [],
        };

        const { saved_objects: queriesSavedObjects } = await savedObjectsClient.bulkGet(
          pack.queries.map((packQuery) => ({
            // @ts-expect-error update validation
            id: packQuery.id,
            type: savedQuerySavedObjectType,
          }))
        );

        const actionId = uuid.v4();

        const actions = queriesSavedObjects.map((query) => ({
          action_id: actionId,
          '@timestamp': moment().toISOString(),
          expiration: moment().add(2, 'days').toISOString(),
          type: 'INPUT_ACTION',
          input_type: 'osquery',
          agents: selectedAgents,
          data: {
            id: query.id,
            // @ts-expect-error update validation
            query: query.attributes.query,
          },
        }));

        const query = await esClient.bulk<{}>({
          index: '.fleet-actions',
          // @ts-expect-error update validation
          body: actions.reduce((acc, action) => {
            return [...acc, { create: { _index: '.fleet-actions' } }, action];
          }, []),
        });

        return response.ok({
          body: {
            actions,
            query,
          },
        });
      }

      const action = {
        action_id: uuid.v4(),
        '@timestamp': moment().toISOString(),
        expiration: moment().add(2, 'days').toISOString(),
        type: 'INPUT_ACTION',
        input_type: 'osquery',
        agents: selectedAgents,
        data: {
          // @ts-expect-error update validation
          id: request.body.query.id ?? uuid.v4(),
          // @ts-expect-error update validation
          query: request.body.query.query,
        },
      };
      const query = await esClient.index<{}, {}>({
        index: '.fleet-actions',
        body: action,
      });

      return response.ok({
        body: {
          response: query,
          action,
        },
      });
    }
  );
};
