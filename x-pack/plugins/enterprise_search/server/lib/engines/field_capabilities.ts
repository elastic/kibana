/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IScopedClusterClient } from '@kbn/core-elasticsearch-server';

import {
  EnterpriseSearchEngineDetails,
  EnterpriseSearchEngineFieldCapabilities,
} from '../../../common/types/engines';

export const fetchEngineFieldCapabilities = async (
  client: IScopedClusterClient,
  engine: EnterpriseSearchEngineDetails
): Promise<EnterpriseSearchEngineFieldCapabilities> => {
  const { created, name, updated } = engine;
  const fieldCapabilities = await client.asCurrentUser.fieldCaps({
    fields: '*',
    include_unmapped: true,
    index: getEngineIndexAliasName(name),
  });
  return {
    created,
    field_capabilities: fieldCapabilities,
    name,
    updated,
  };
};

// Note: This will likely need to be modified when engines move to es module
const getEngineIndexAliasName = (engineName: string): string => `search-engine-${engineName}`;
