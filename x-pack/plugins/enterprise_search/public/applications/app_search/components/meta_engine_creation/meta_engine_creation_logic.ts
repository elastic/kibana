/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';

interface MetaEngineCreationValues {
  indexedEngineNames: string[];
  rawName: string;
}

interface MetaEngineCreationActions {
  setIndexedEngineNames(
    indexedEngineNames: MetaEngineCreationValues['indexedEngineNames']
  ): { indexedEngineNames: MetaEngineCreationValues['indexedEngineNames'] };
  setRawName(rawName: string): { rawName: string };
}

export const MetaEngineCreationLogic = kea<
  MakeLogicType<MetaEngineCreationValues, MetaEngineCreationActions>
>({
  path: ['enterprise_search', 'app_search', 'meta_engine_creation_logic'],
  actions: {
    setIndexedEngineNames: (indexedEngineNames) => ({ indexedEngineNames }),
    setRawName: (rawName) => ({ rawName }),
  },
  reducers: {
    indexedEngineNames: [
      [],
      {
        setIndexedEngineNames: (_, { indexedEngineNames }) => indexedEngineNames,
      },
    ],
    rawName: [
      '',
      {
        setRawName: (_, { rawName }) => rawName,
      },
    ],
  },
  selectors: ({ selectors }) => ({}),
  listeners: ({ values, actions }) => ({}),
});
