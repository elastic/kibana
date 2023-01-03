/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createApiLogic } from '../../../shared/api_logic/create_api_logic';

import { EngineListDetails, Meta } from '../../components/engines/types';

interface EnginesListAPIResponse {
  results: EngineListDetails[];
  meta: Meta;
}

const metaValue: Meta = {
  from: 1,
  size: 3,
  total: 5,
};
// These are mocked values. To be changed as per the latest requirement when Backend API is ready
export const mockedEngines: EnginesListAPIResponse[] = [
  {
    meta: metaValue,
    results: [
      {
        name: 'engine-name-1',
        indices: ['index-18', 'index-23'],
        last_updated: '21 March 2021',
        document_count: 18,
      },
      {
        name: 'engine-name-2',
        indices: ['index-180', 'index-230', 'index-8', 'index-2'],
        last_updated: '10 Jul 2018',
        document_count: 10,
      },

      {
        name: 'engine-name-3',
        indices: ['index-2', 'index-3'],
        last_updated: '21 December 2022',
        document_count: 8,
      },
    ],
  },
];
export const fetchEngines = async () => {
  //  TODO replace with http call when backend is ready
  return mockedEngines[0];
};

export const FetchEnginesAPILogic = createApiLogic(['content', 'engines_api_logic'], fetchEngines);
