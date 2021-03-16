/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { find } from 'lodash/fp';
import uuid from 'uuid';
import moment from 'moment';

import { packSavedObjectType, savedQuerySavedObjectType } from '../../../common/types';

export interface AgentsSelection {
  agents: string[];
  allAgentsSelected: boolean;
  platformsSelected: string[];
  policiesSelected: string[];
}

// @ts-expect-error update validation
export const createActionHandler = async (esClient, soClient, params) => {
  const selectedAgents: string[] = [];
  const {
    agentSelection: {
      allAgentsSelected = false,
      platformsSelected = [],
      policiesSelected = [],
      agents = [],
    },
  } = params as { agentSelection: AgentsSelection };
  // TODO: fix up the types here
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const extractIds = ({ body }: Record<string, any>) =>
    body.hits.hits
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((o: Record<string, any>) => o._source.local_metadata?.elastic.agent.id)
      .filter((e: string) => e);
  if (allAgentsSelected) {
    // make a query for all agent ids
    const idRes = await esClient.search({
      index: '.fleet-agents',
      body: {
        _source: 'local_metadata.elastic.agent.id',
        size: 9000,
        query: {
          match_all: {},
        },
      },
    });
    const ids = extractIds(idRes);
    selectedAgents.push(...ids);
  } else if (platformsSelected.length > 0 || policiesSelected.length > 0) {
    const filters: Array<{
      term: { [key: string]: string };
    }> = platformsSelected.map((platform) => ({
      term: { 'local_metadata.os.platform': platform },
    }));
    filters.push(...policiesSelected.map((policyId) => ({ term: { policyId } })));
    const query = {
      index: '.fleet-agents',
      body: {
        _source: 'local_metadata.elastic.agent.id',
        size: 9000,
        query: {
          bool: {
            filter: [
              {
                bool: {
                  should: filters,
                },
              },
            ],
          },
        },
      },
    };
    // @ts-expect-error update types
    const ids = extractIds(await esClient.search<{}, {}>(query));
    selectedAgents.push(...ids);
  } else {
    selectedAgents.push(...agents);
  }

  if (params.pack_id) {
    // @ts-expect-error update validation
    const { attributes, references, ...rest } = await soClient.get<{
      title: string;
      description: string;
      queries: Array<{ name: string; interval: string }>;
    }>(packSavedObjectType, params.pack_id);

    const pack = {
      ...rest,
      ...attributes,
      queries:
        // @ts-expect-error update validation
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

    const { saved_objects: queriesSavedObjects } = await soClient.bulkGet(
      // @ts-expect-error update validation
      pack.queries.map((packQuery) => ({
        id: packQuery.id,
        type: savedQuerySavedObjectType,
      }))
    );

    const actionId = uuid.v4();

    // @ts-expect-error update validation
    const actions = queriesSavedObjects.map((query) => ({
      action_id: actionId,
      '@timestamp': moment().toISOString(),
      expiration: moment().add(2, 'days').toISOString(),
      type: 'INPUT_ACTION',
      input_type: 'osquery',
      agents: selectedAgents,
      data: {
        id: query.id,
        query: query.attributes.query,
      },
    }));

    // @ts-expect-error update validation
    const query = await esClient.bulk<{}>({
      index: '.fleet-actions',
      // @ts-expect-error update validation
      body: actions.reduce((acc, action) => {
        return [...acc, { create: { _index: '.fleet-actions' } }, action];
      }, []),
    });

    return {
      actions,
      query,
    };
  }

  const action = {
    action_id: uuid.v4(),
    '@timestamp': moment().toISOString(),
    expiration: moment().add(2, 'days').toISOString(),
    type: 'INPUT_ACTION',
    input_type: 'osquery',
    agents: selectedAgents,
    data: {
      id: params.query.id ?? uuid.v4(),
      query: params.query.query,
    },
  };

  // @ts-expect-error update validation
  const query = await esClient.index<{}, {}>({
    index: '.fleet-actions',
    body: action,
  });

  return {
    response: query,
    actions: [action],
  };
};
