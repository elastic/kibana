/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { suggestEMSTermJoinConfig } from './ems_autosuggest';
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

  getFields() {
    return this._fields;
  }

  getGeoJson() {
    if (this._url === 'world_countries') {
      return ({
        type: 'FeatureCollection',
        features: [
          { properties: { iso2: 'CA', iso3: 'CAN' } },
          { properties: { iso2: 'US', iso3: 'USA' } },
        ],
      } as unknown) as FeatureCollection;
    } else if (this._url === 'zips') {
      return ({
        type: 'FeatureCollection',
        features: [{ properties: { zip: '40204' } }, { properties: { zip: '40205' } }],
      } as unknown) as FeatureCollection;
    } else {
      throw new Error(`unrecognized mock url ${this._url}`);
    }
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
  };
});

describe('suggestEMSTermJoinConfig', () => {
  test('no info provided', async () => {
    const termJoinConfig = await suggestEMSTermJoinConfig({});
    expect(termJoinConfig).toBe(null);
  });

  describe('validate common column names', () => {
    test('ecs region', async () => {
      const termJoinConfig = await suggestEMSTermJoinConfig({
        sampleValuesColumnName: 'destination.geo.region_iso_code',
      });
      expect(termJoinConfig).toEqual({
        layerId: 'administrative_regions_lvl2',
        field: 'region_iso_code',
      });
    });

    test('ecs country', async () => {
      const termJoinConfig = await suggestEMSTermJoinConfig({
        sampleValuesColumnName: 'country_iso_code',
      });
      expect(termJoinConfig).toEqual({
        layerId: 'world_countries',
        field: 'iso2',
      });
    });

    test('country', async () => {
      const termJoinConfig = await suggestEMSTermJoinConfig({
        sampleValuesColumnName: 'Country_name',
      });
      expect(termJoinConfig).toEqual({
        layerId: 'world_countries',
        field: 'name',
      });
    });

    test('unknown name', async () => {
      const termJoinConfig = await suggestEMSTermJoinConfig({
        sampleValuesColumnName: 'cntry',
      });
      expect(termJoinConfig).toEqual(null);
    });
  });

  describe('validate well known formats', () => {
    test('5-digit zip code', async () => {
      const termJoinConfig = await suggestEMSTermJoinConfig({
        sampleValues: ['90201', 40204],
      });
      expect(termJoinConfig).toEqual({
        layerId: 'usa_zip_codes',
        field: 'zip',
      });
    });

    test('mismatch', async () => {
      const termJoinConfig = await suggestEMSTermJoinConfig({
        sampleValues: ['90201', 'foobar'],
      });
      expect(termJoinConfig).toEqual(null);
    });
  });

  describe('validate based on EMS data', () => {
    test('Should validate with zip codes layer', async () => {
      const termJoinConfig = await suggestEMSTermJoinConfig({
        sampleValues: ['40204', 40205],
        emsLayerIds: ['world_countries', 'zips'],
      });
      expect(termJoinConfig).toEqual({
        layerId: 'zips',
        field: 'zip',
      });
    });

    test('Should not validate with faulty zip codes', async () => {
      const termJoinConfig = await suggestEMSTermJoinConfig({
        sampleValues: ['40204', '00000'],
        emsLayerIds: ['world_countries', 'zips'],
      });
      expect(termJoinConfig).toEqual(null);
    });

    test('Should validate against countries', async () => {
      const termJoinConfig = await suggestEMSTermJoinConfig({
        sampleValues: ['USA', 'USA', 'CAN'],
        emsLayerIds: ['world_countries', 'zips'],
      });
      expect(termJoinConfig).toEqual({
        layerId: 'world_countries',
        field: 'iso3',
      });
    });

    test('Should not validate against missing countries', async () => {
      const termJoinConfig = await suggestEMSTermJoinConfig({
        sampleValues: ['USA', 'BEL', 'CAN'],
        emsLayerIds: ['world_countries', 'zips'],
      });
      expect(termJoinConfig).toEqual(null);
    });
  });
});
