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
          { properties: { iso2: 'CA', iso3: 'CAN', name: 'Canada' } },
          { properties: { iso2: 'US', iso3: 'USA', name: 'United States' } },
        ],
      } as unknown) as FeatureCollection;
    } else if (this._url === 'usa_zip_codes') {
      return ({
        type: 'FeatureCollection',
        features: [{ properties: { zip: '40204' } }, { properties: { zip: '40205' } }],
      } as unknown) as FeatureCollection;
    } else {
      throw new Error(`unrecognized mock url ${this._url}`);
    }
  }

  getId() {
    return this._id;
  }

  hasId(id: string) {
    return id === this._id;
  }
}

jest.mock('../util', () => {
  return {
    async getEmsFileLayers() {
      return [
        new MockFileLayer('world_countries', [{ id: 'iso2' }, { id: 'iso3' }, { id: 'name' }]),
        new MockFileLayer('usa_zip_codes', [{ id: 'zip' }]),
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
        fieldName: 'destination.geo.region_iso_code',
      });
      expect(termJoinConfig).toEqual({
        layerId: 'administrative_regions_lvl2',
        field: 'region_iso_code',
      });
    });

    test('ecs country', async () => {
      const termJoinConfig = await suggestEMSTermJoinConfig({
        fieldName: 'country_iso_code',
      });
      expect(termJoinConfig).toEqual({
        layerId: 'world_countries',
        field: 'iso2',
      });
    });

    test('country - (without any sampleValues, this can validate with any column that allows something with country in it)', async () => {
      const termJoinConfig = await suggestEMSTermJoinConfig({
        fieldName: 'Country_name',
      });
      expect(termJoinConfig).toEqual({
        layerId: 'world_countries',
        field: 'iso2',
      });
    });

    test('unknown name', async () => {
      const termJoinConfig = await suggestEMSTermJoinConfig({
        fieldName: 'cntry',
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

    test('2 character iso code with country in column-name', async () => {
      const termJoinConfig = await suggestEMSTermJoinConfig({
        sampleValues: ['US', 'AR', 'KR', 'ZA', 'IT', 'CN', 'DE', 'CA', 'EC'],
        fieldName: 'OriginCountry',
      });
      expect(termJoinConfig).toEqual({
        layerId: 'world_countries',
        field: 'iso2',
      });
    });

    test('2 character iso code', async () => {
      const termJoinConfig = await suggestEMSTermJoinConfig({
        sampleValues: ['US', 'AR', 'KR', 'ZA', 'IT', 'CN', 'DE', 'CA', 'EC'],
      });
      expect(termJoinConfig).toEqual({
        layerId: 'world_countries',
        field: 'iso2',
      });
    });

    test('countrynames with country in column-name', async () => {
      const termJoinConfig = await suggestEMSTermJoinConfig({
        sampleValues: ['Canada', 'United States'],
        fieldName: 'CountryOfOrigin',
      });
      expect(termJoinConfig).toEqual({
        layerId: 'world_countries',
        field: 'name',
      });
    });

    test('countrynames with country in column-name, but also iso2', async () => {
      const termJoinConfig = await suggestEMSTermJoinConfig({
        sampleValues: ['US', 'AR', 'KR', 'ZA', 'IT', 'CN', 'DE', 'CA', 'EC'],
        fieldName: 'CountryOfOrigin',
      });
      expect(termJoinConfig).toEqual({
        layerId: 'world_countries',
        field: 'iso2',
      });
    });

    test('country - (without sampleValues, no real determination can be made)', async () => {
      const termJoinConfig = await suggestEMSTermJoinConfig({
        fieldName: 'Country_name',
      });
      expect(termJoinConfig).toEqual({
        layerId: 'world_countries',
        field: 'iso2',
      });
    });

    test('country - (with sampleValues, this should get narrowed down to the correct layer because the values violate the iso regex pattern)', async () => {
      const termJoinConfig = await suggestEMSTermJoinConfig({
        fieldName: 'Country_name',
        sampleValues: ['Zaire', 'Mesopotamia'],
      });
      expect(termJoinConfig).toEqual({
        layerId: 'world_countries',
        field: 'name',
      });
    });

    test('country - (with sampleValues, this should get rejected because not validated by ems)', async () => {
      const termJoinConfig = await suggestEMSTermJoinConfig({
        fieldName: 'Country_name',
        sampleValues: ['Zaire', 'Mesopotamia'],
        emsLayerIds: ['world_countries'],
      });
      expect(termJoinConfig).toEqual(null);
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
        emsLayerIds: ['world_countries', 'usa_zip_codes'],
      });
      expect(termJoinConfig).toEqual({
        layerId: 'usa_zip_codes',
        field: 'zip',
      });
    });

    test('Should not validate with faulty zip codes', async () => {
      const termJoinConfig = await suggestEMSTermJoinConfig({
        sampleValues: ['40204', '00000'],
        emsLayerIds: ['world_countries', 'usa_zip_codes'],
      });
      expect(termJoinConfig).toEqual(null);
    });

    test('Should validate against countries', async () => {
      const termJoinConfig = await suggestEMSTermJoinConfig({
        sampleValues: ['USA', 'USA', 'CAN'],
        emsLayerIds: ['world_countries', 'usa_zip_codes'],
      });
      expect(termJoinConfig).toEqual({
        layerId: 'world_countries',
        field: 'iso3',
      });
    });

    test('Should not validate against missing countries', async () => {
      const termJoinConfig = await suggestEMSTermJoinConfig({
        sampleValues: ['USA', 'BEL', 'CAN'],
        emsLayerIds: ['world_countries', 'usa_zip_codes'],
      });
      expect(termJoinConfig).toEqual(null);
    });

    test('2 character iso code with country in name should not be validated by ems because ems does not contain all samples ', async () => {
      const termJoinConfig = await suggestEMSTermJoinConfig({
        sampleValues: ['US', 'AR', 'KR', 'ZA', 'IT', 'CN', 'DE', 'CA', 'EC'],
        fieldName: 'OriginCountry',
        emsLayerIds: ['world_countries'],
      });
      expect(termJoinConfig).toEqual(null);
    });

    test('2 character iso code with country in name should be validated by ems because ems does contain all samples ', async () => {
      const termJoinConfig = await suggestEMSTermJoinConfig({
        sampleValues: ['US', 'CA'],
        fieldName: 'OriginCountry',
        emsLayerIds: ['world_countries'],
      });
      expect(termJoinConfig).toEqual({ field: 'iso2', layerId: 'world_countries' });
    });
  });
});
