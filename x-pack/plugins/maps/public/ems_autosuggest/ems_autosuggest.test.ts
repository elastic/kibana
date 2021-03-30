/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { suggestEMSTermJoinConfig } from './ems_autosuggest';
import { FORMAT_TYPE } from '../../common';
import { FeatureCollection } from 'geojson';

class MockFileLayer {
  private readonly _url: string;
  private readonly _id: string;
  private readonly _fields: Array<{ id: string }>;

  constructor(url: string, fields: Array<{ id: string }>) {
    this._url = url;
    this._id = url;
    this._fields = fields;
  }
  getDefaultFormatUrl() {
    return this._url;
  }

  getFields() {
    return this._fields;
  }

  getDefaultFormatType() {
    return FORMAT_TYPE.GEOJSON;
  }

  hasId(id: string) {
    return id === this._id;
  }
}

jest.mock('../util', () => {
  return {
    async getEmsFileLayers() {
      return [
        new MockFileLayer('world_countries', [{ id: 'iso2' }, { id: 'iso3' }]),
        new MockFileLayer('zips', [{ id: 'zip' }]),
      ];
    },
    async fetchGeoJson(url: string): Promise<FeatureCollection> {
      if (url === 'world_countries') {
        return ({
          type: 'FeatureCollection',
          features: [
            { properties: { iso2: 'CA', iso3: 'CAN' } },
            { properties: { iso2: 'US', iso3: 'USA' } },
          ],
        } as unknown) as FeatureCollection;
      } else if (url === 'zips') {
        return ({
          type: 'FeatureCollection',
          features: [{ properties: { zip: '40204' } }, { properties: { zip: '40205' } }],
        } as unknown) as FeatureCollection;
      } else {
        throw new Error(`unrecognized mock url ${url}`);
      }
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
    ].forEach((testStub) => {
      test(testStub.name, async () => {
        const termJoinConfig = await suggestEMSTermJoinConfig({
          sampleValuesColumnName: testStub.columnName,
        });
        expect(termJoinConfig).toEqual(testStub.config);
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
    ].forEach((testStub) => {
      test(testStub.name, async () => {
        const termJoinConfig = await suggestEMSTermJoinConfig({
          sampleValues: testStub.values,
        });
        expect(termJoinConfig).toEqual(testStub.config);
      });
    });
  });

  describe('validate based on EMS data', () => {
    [
      {
        name: 'Should validate with zip codes layer',
        values: ['40204', 40205],
        layerIds: ['world_countries', 'zips'],
        config: {
          layerId: 'zips',
          field: 'zip',
        },
      },
      {
        name: 'Should not validate with faulty zip codes',
        values: ['40204', '00000'],
        layerIds: ['world_countries', 'zips'],
        config: null,
      },
      {
        name: 'Should validate against countries',
        values: ['USA', 'USA', 'CAN'],
        layerIds: ['world_countries', 'zips'],
        config: {
          layerId: 'world_countries',
          field: 'iso3',
        },
      },
      {
        name: 'Should not validate against countries',
        values: ['USA', 'BEL', 'CAN'],
        layerIds: ['world_countries', 'zips'],
        config: null,
      },
    ].forEach((testStub) => {
      test(testStub.name, async () => {
        const termJoinConfig = await suggestEMSTermJoinConfig({
          sampleValues: testStub.values,
          emsLayerIds: testStub.layerIds,
        });
        expect(termJoinConfig).toEqual(testStub.config);
      });
    });
  });
});
