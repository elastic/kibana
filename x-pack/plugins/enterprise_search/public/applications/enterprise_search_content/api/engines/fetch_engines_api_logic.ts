/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createApiLogic } from '../../../shared/api_logic/create_api_logic';

import { EnginesListAPIResponse } from '../../components/engines/types';

// export type FetchEnginesApiLogicResponse = EnginesListAPIResponse[];
export const mockedEngines: EnginesListAPIResponse[] = [
  {
    meta: {
      from: 0,
      size: 5,
      total: 10,
    },
    results: [
      {
        name: 'engine-name-1',
        indices: ['index-18', 'index-23'],
        last_updated: '10 Aug',
        document_count: 10,
      },
      {
        name: 'engine-name-2',
        indices: ['index-123', 'index-2345'],
        last_updated: '10 Aug',
        document_count: 10,
      },
      {
        name: 'engine-name-1',
        indices: ['index-18', 'index-23'],
        last_updated: '10 Aug',
        document_count: 10,
      },
      {
        name: 'engine-name-2',
        indices: ['index-123', 'index-2345'],
        last_updated: '10 Aug',
        document_count: 10,
      },
      {
        name: 'engine-name-1',
        indices: ['index-18', 'index-23'],
        last_updated: '10 Aug',
        document_count: 10,
      },
      {
        name: 'engine-name-2',
        indices: ['index-123', 'index-2345'],
        last_updated: '10 Aug',
        document_count: 10,
      },
    ],
  },
];

export const fetchEngines = async () => {
  // TODO replace with http call when backend is ready

  return mockedEngines[0];
};

export const FetchEnginesAPILogic = createApiLogic(['content', 'engines_api_logic'], fetchEngines);
