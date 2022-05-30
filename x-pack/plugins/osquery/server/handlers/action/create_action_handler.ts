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

// @ts-expect-error update validation
export const createActionHandler = async (esClient, soClient, params) => {
  console.log({ params });
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
        // @ts-expect-error update types
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
      agents: params.agents,
      data: {
        id: query.id,
        query: query.attributes.query,
      },
    }));

    // @ts-expect-error update validation
    console.log({ actions });
    const query = await esClient.bulk<{}>({
      index: '.fleet-actions',
      // @ts-expect-error update validation
      body: actions.reduce(
        (acc, action) => [...acc, { create: { _index: '.fleet-actions' } }, action],
        []
      ),
    });
    console.log({ query });

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
    agents: params.agents,
    data: {
      id: params.query.id ?? uuid.v4(),
      query: params.query.query,
    },
  };

  console.log({ action });
  // // @ts-expect-error update validation
  // const query = await esClient.index<{}, {}>({
  //   index: '.fleet-actions',
  //   body: action,
  // });
  // console.log({ query });

  return {
    response: true,
    actions: [action],
  };
};
