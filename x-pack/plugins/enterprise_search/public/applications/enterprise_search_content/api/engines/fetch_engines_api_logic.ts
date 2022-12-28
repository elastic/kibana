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
        last_updated: '10 Aug 2021',
        document_count: 1,
      },
      {
        name: 'engine-name-2',
        indices: ['index-123', 'index-2345'],
        last_updated: '05 Jan 2021',
        document_count: 20,
      },
      {
        name: 'engine-name-1',
        indices: ['index-18', 'index-23'],
        last_updated: '21 March 2021',
        document_count: 8,
      },
      {
        name: 'engine-name-2',
        indices: ['index-123', 'index-2345'],
        last_updated: '16 December 2021',
        document_count: 9,
      },
      {
        name: 'engine-name-1',
        indices: ['index-18', 'index-23'],
        last_updated: '09 Feb 2021',
        document_count: 30,
      },
      {
        name: 'engine-name-2',
        indices: ['index-123', 'index-2345'],
        last_updated: '1 June 2019',
        document_count: 18,
      },
    ],
  },
];

export const fetchEngines = async () => {
  // TODO replace with http call when backend is ready

  return mockedEngines[0];
};

export const FetchEnginesAPILogic = createApiLogic(['content', 'engines_api_logic'], fetchEngines);
