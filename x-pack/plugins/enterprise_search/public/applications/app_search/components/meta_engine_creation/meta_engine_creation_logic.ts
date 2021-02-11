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
  selectedIndexedEngineNames: string[];
}

interface MetaEngineCreationActions {
  setIndexedEngineNames(
    indexedEngineNames: MetaEngineCreationValues['indexedEngineNames']
  ): { indexedEngineNames: MetaEngineCreationValues['indexedEngineNames'] };
  setRawName(rawName: string): { rawName: string };
  setSelectedIndexedEngineNames(
    selectedIndexedEngineNames: MetaEngineCreationValues['selectedIndexedEngineNames']
  ): { selectedIndexedEngineNames: MetaEngineCreationValues['selectedIndexedEngineNames'] };
}

export const MetaEngineCreationLogic = kea<
  MakeLogicType<MetaEngineCreationValues, MetaEngineCreationActions>
>({
  path: ['enterprise_search', 'app_search', 'meta_engine_creation_logic'],
  actions: {
    setIndexedEngineNames: (indexedEngineNames) => ({ indexedEngineNames }),
    setRawName: (rawName) => ({ rawName }),
    setSelectedIndexedEngineNames: (selectedIndexedEngineNames) => ({ selectedIndexedEngineNames }),
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
    selectedIndexedEngineNames: [
      [],
      {
        setSelectedIndexedEngineNames: (_, { selectedIndexedEngineNames }) =>
          selectedIndexedEngineNames,
      },
    ],
  },
  selectors: ({ selectors }) => ({}),
  listeners: ({ values, actions }) => ({}),
});
