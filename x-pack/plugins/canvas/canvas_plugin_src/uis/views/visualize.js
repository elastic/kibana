/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const visualize = () => ({
  name: 'visualize',
  displayName: 'Visualize',
  help: 'Show your time series data on a visualize',
  modelArgs: [], // TODO: this is weird, fix it upsteam
  args: [
    {
      name: 'id',
      displayName: 'Visualization ID',
      help: 'The id of visualization',
      argType: 'visualize_select',
    },
  ],
});
