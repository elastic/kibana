/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { CasesConfigurationUI } from '../types';
import { ConnectorTypes } from '../../../common';

export const initialConfiguration: CasesConfigurationUI = {
  closureType: 'close-by-user',
  connector: {
    fields: null,
    id: 'none',
    name: 'none',
    type: ConnectorTypes.none,
  },
  customFields: [],
  mappings: [],
  version: '',
  id: '',
  owner: '',
};

export const getConfigurationByOwner = ({
  configurations,
  owner,
}: {
  configurations: CasesConfigurationUI[] | null;
  owner: string | undefined;
}): CasesConfigurationUI => {
  if (!configurations || !configurations.length || !owner) {
    return initialConfiguration;
  }

  // fallback to configuration 0 which was what happened before
  return configurations.find((element) => element.owner === owner) ?? initialConfiguration;
};
