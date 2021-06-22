/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { suggestEMSTermJoinConfig } from './ems_autosuggest';
import { FeatureCollection } from 'geojson';

class MockFileLayer {
  private readonly _id: string;
  private readonly _geoJson: FeatureCollection;
  private readonly _fields: Array<{ id: string }>;

  constructor(
    id: string,
    fields: Array<{ id: string; alias?: string[]; values?: string[] }>,
    geoJson: FeatureCollection
  ) {
    this._id = id;
    this._fields = fields;
    this._geoJson = geoJson;
  }

  getId() {
    return this._id;
  }

  getFields() {
    return this._fields;
  }

  getGeoJson() {
    return this._geoJson;
  }

  hasId(id: string) {
    return id === this._id;
  }
}

jest.mock('../util', () => {
  return {
    async getEmsFileLayers() {
      return [
        new MockFileLayer(
          'world_countries',
          [
            {
              id: 'iso2',
              alias: ['(geo\\.){0,}country_iso_code$', '(country|countries)'],
              values: ['CA', 'US'],
            },
            { id: 'iso3', values: ['CAN', 'USA'] },
            { id: 'name', alias: ['(country|countries)'] },
          ],
          ({
            type: 'FeatureCollection',
            features: [
              { properties: { iso2: 'CA', iso3: 'CAN', name: 'Canada' } },
              { properties: { iso2: 'US', iso3: 'USA', name: 'United States of America' } },
            ],
          } as unknown) as FeatureCollection
        ),
        new MockFileLayer(
          'usa_zip_codes',
          [{ id: 'zip', alias: ['zip'], values: ['40204', '40205'] }],
          ({
            type: 'FeatureCollection',
            features: [{ properties: { zip: '40204' } }, { properties: { zip: '40205' } }],
          } as unknown) as FeatureCollection
        ),
      ];
    },
  };
});

describe('suggestEMSTermJoinConfig', () => {
  test('Should not validate when no info provided', async () => {
    const termJoinConfig = await suggestEMSTermJoinConfig({});
    expect(termJoinConfig).toBe(null);
  });

  describe('With common column names', () => {
    test('should match first match', async () => {
      const termJoinConfig = await suggestEMSTermJoinConfig({
        sampleValuesColumnName: 'country_iso_code',
      });
      expect(termJoinConfig).toEqual({
        layerId: 'world_countries',
        field: 'iso2',
      });
    });

    test('When sampleValues are provided, should reject match if no sampleValues for a layer, even though the name matches', async () => {
      const termJoinConfig = await suggestEMSTermJoinConfig({
        sampleValuesColumnName: 'country_iso_code',
        sampleValues: ['FO', 'US', 'CA'],
      });
      expect(termJoinConfig).toEqual(null);
    });

    test('should reject match if sampleValues not in id-list', async () => {
      const termJoinConfig = await suggestEMSTermJoinConfig({
        sampleValuesColumnName: 'zip',
        sampleValues: ['90201', '40205'],
      });
      expect(termJoinConfig).toEqual(null);
    });

    test('should return first match (regex matches both iso2 and name)', async () => {
      const termJoinConfig = await suggestEMSTermJoinConfig({
        sampleValuesColumnName: 'Country_name',
      });
      expect(termJoinConfig).toEqual({
        layerId: 'world_countries',
        field: 'iso2',
      });
    });

    test('unknown name', async () => {
      const termJoinConfig = await suggestEMSTermJoinConfig({
        sampleValuesColumnName: 'cntry',
      });
      expect(termJoinConfig).toEqual(null);
    });
  });

  describe('validate well known formats (using id-values in manifest)', () => {
    test('Should validate known zipcodes', async () => {
      const termJoinConfig = await suggestEMSTermJoinConfig({
        sampleValues: ['40205', 40204],
      });
      expect(termJoinConfig).toEqual({
        layerId: 'usa_zip_codes',
        field: 'zip',
      });
    });

    test('Should not validate unknown zipcode (in this case, 90201)', async () => {
      const termJoinConfig = await suggestEMSTermJoinConfig({
        sampleValues: ['90201', 40204],
      });
      expect(termJoinConfig).toEqual(null);
    });

    test('Should not validate mismatches', async () => {
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
  });
});
