/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import uuid from 'uuid';
import moment from 'moment';
import type { ElasticsearchClient } from '@kbn/core/server';

export const createActionHandler = async (
  esClient: ElasticsearchClient,
  params: {
    agents: string[];
    query: {
      id?: string;
      query: string;
      ecs_mapping: Record<string, Record<'field', string>>;
    };
  }
) => {
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
      ecs_mapping: params.query.ecs_mapping,
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
