/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FetchEnginesApiLogicResponse } from '../../../api/engines/fetch_engines_api_logic';

export const mockedEngines: FetchEnginesApiLogicResponse = [
  {
    name: 'engine1',
    document_count: 100,
    last_updated: 'Aug 05, 2012',
    indices: { index_count: 2 },
  },
  {
    name: 'engine2',
    document_count: 50,
    last_updated: 'Aug 05, 2012',
    indices: { index_count: 1 },
  },
];
