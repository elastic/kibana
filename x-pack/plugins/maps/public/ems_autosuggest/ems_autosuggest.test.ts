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
  test('no info provided', async () => {
    const termJoinConfig = await suggestEMSTermJoinConfig({});
    expect(termJoinConfig).toBe(null);
  });

  describe('validate common column names', () => {
    [
      {
        name: 'ecs region',
        columnName: 'destination.geo.region_iso_code',
        config: {
          layerId: 'administrative_regions_lvl2',
          field: 'region_iso_code',
        },
      },
      {
        name: 'ecs country',
        columnName: 'country_iso_code',
        config: {
          layerId: 'world_countries',
          field: 'iso2',
        },
      },
      {
        name: 'country',
        columnName: 'Country_name',
        config: {
          layerId: 'world_countries',
          field: 'name',
        },
      },
      {
        name: 'unknown name',
        columnName: 'cntry',
        config: null,
      },
    ].forEach((stub) => {
      test(stub.name, async () => {
        const termJoinConfig = await suggestEMSTermJoinConfig({
          sampleValuesColumnName: stub.columnName,
        });
        expect(termJoinConfig).toEqual(stub.config);
      });
    });
  });

  describe('validate well known formats', () => {
    [
      {
        name: '5-digit zip code',
        values: ['90201', 40204],
        config: {
          layerId: 'usa_zip_codes',
          field: 'zip',
        },
      },
      {
        name: 'mismatch',
        values: ['90201', 'foobar'],
        config: null,
      },
    ].forEach((stub) => {
      test(stub.name, async () => {
        const termJoinConfig = await suggestEMSTermJoinConfig({
          sampleValues: stub.values,
        });
        expect(termJoinConfig).toEqual(stub.config);
      });
    });
  });
});
