/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import uuid from 'uuid';
import moment from 'moment';

// @ts-expect-error update validation
export const createActionHandler = async (esClient, params) => {
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
