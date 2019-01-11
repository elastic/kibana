/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const templateProperties = {
  type: { type: 'keyword' },
  task: {
    properties: {
      taskType: { type: 'keyword' },
      runAt: { type: 'date' },
      interval: { type: 'text' },
      attempts: { type: 'integer' },
      status: { type: 'keyword' },
      params: { type: 'text' },
      state: { type: 'text' },
      user: { type: 'keyword' },
      scope: { type: 'keyword' },
      timeout: { type: 'integer' },
    },
  },
};
