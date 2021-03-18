/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { suggestEMSTermJoinConfig } from './ems_autosuggest';

jest.mock('../util', () => {
  return {
    async getEmsFileLayers() {
      return [];
    },
  };
});

describe('suggestEMSTermJoinConfig', () => {
  test('should reject', async () => {
    const termJoinConfig = await suggestEMSTermJoinConfig({
      sampleValues: [],
      sampleValuesColumnName: 'state',
      emsLayerIds: [],
    });
    expect(termJoinConfig!.layerId).toBe('foo');
    expect(termJoinConfig!.field).toBe('bar');
  });
});
