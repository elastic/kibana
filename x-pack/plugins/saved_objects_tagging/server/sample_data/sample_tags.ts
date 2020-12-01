/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { TagSavedObject } from '../../common/types';

export const sampleDataTag: TagSavedObject = {
  id: '87432a43-2251-4b09-8985-32bfb0e5bef0',
  type: 'tag',
  updated_at: '2020-12-01T15:13:03.270Z',
  version: '1',
  migrationVersion: {},
  attributes: {
    name: 'Sample Data',
    description: 'Kibana sample data',
    color: '#c88735',
  },
  references: [],
};

export const flightsTag: TagSavedObject = {
  id: '25979ea2-1078-45a2-a6cb-a7b3d044bee6',
  type: 'tag',
  updated_at: '2020-12-01T15:13:03.270Z',
  version: '1',
  migrationVersion: {},
  attributes: {
    name: 'Flights',
    description: 'Sample flight data',
    color: '#2ADD05',
  },
  references: [],
};

export const logsTag: TagSavedObject = {
  id: '4a0b1da4-4a89-4262-8f72-7abb2ef71e19',
  // Sample web logs
  type: 'tag',
  updated_at: '2020-12-01T15:13:03.270Z',
  version: '1',
  migrationVersion: {},
  attributes: {
    name: 'Logs',
    description: 'Sample flight data',
    color: '#1479EC',
  },
  references: [],
};

export const ecommerceTag: TagSavedObject = {
  id: '77792b89-2572-4be7-b331-fa540e187aac',
  // Sample eCommerce orders
  type: 'tag',
  updated_at: '2020-12-01T15:13:03.270Z',
  version: '1',
  migrationVersion: {},
  attributes: {
    name: 'eCommerce',
    description: 'Sample flight data',
    color: '#F30EC9',
  },
  references: [],
};
