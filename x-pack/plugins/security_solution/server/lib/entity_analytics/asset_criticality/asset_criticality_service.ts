/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty } from 'lodash/fp';
interface CriticalityIdentifiers {
  [key: string]: string | string[];
}

interface AssetCriticality {
  level: string;
  modifier: number;
  id_field: string;
  id_value: string;
}

const getCriticalitiesByIdentifier = async (
  identifier: CriticalityIdentifiers
): Promise<AssetCriticality[]> => {
  if (isEmpty(identifier)) {
    throw new Error('At least one identifier must be provided');
  }
  if (Object.values(identifier).every((identifierValue) => isEmpty(identifierValue))) {
    throw new Error('At least one identifier must contain a value');
  }

  return [];
};

export const createAssetCriticalityService = () => ({
  getCriticalitiesByIdentifier,
});
