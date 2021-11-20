/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TableSource } from './table_source';
import { FIELD_ORIGIN } from '../../../../common/constants';
import {
  VectorJoinSourceRequestMeta,
  VectorSourceRequestMeta,
} from '../../../../common/descriptor_types';

describe('TableSource', () => {
  describe('getName', () => {
    it('should get default display name', async () => {
      const tableSource = new TableSource({});
      expect((await tableSource.getDisplayName()).startsWith('table source')).toBe(true);
    });
  });

  describe('getPropertiesMap', () => {
    it('should roll up results', async () => {
      const tableSource = new TableSource({
        term: 'iso',
        __rows: [
          {
            iso: 'US',
            population: 100,
          },
          {
            iso: 'CN',
            population: 400,
            foo: 'bar', // ignore this prop, not defined in `__columns`
          },
          {
            // ignore this row, cannot be joined
            population: 400,
          },
          {
            // row ignored since it's not first row with key 'US'
            iso: 'US',
            population: -1,
          },
        ],
        __columns: [
          {
            name: 'iso',
            type: 'string',
          },
          {
            name: 'population',
            type: 'number',
          },
        ],
      });

      const propertiesMap = await tableSource.getPropertiesMap(
        {} as unknown as VectorJoinSourceRequestMeta,
        'a',
        'b',
        () => {}
      );

      expect(propertiesMap.size).toEqual(2);
      expect(propertiesMap.get('US')).toEqual({
        population: 100,
      });
      expect(propertiesMap.get('CN')).toEqual({
        population: 400,
      });
    });
  });

  describe('getTermField', () => {
    it('should throw when no match', async () => {
      const tableSource = new TableSource({
        term: 'foobar',
        __columns: [
          {
            name: 'iso',
            type: 'string',
          },
          {
            name: 'population',
            type: 'number',
          },
        ],
      });

      expect(() => {
        tableSource.getTermField();
      }).toThrow();
    });

    it('should return field', async () => {
      const tableSource = new TableSource({
        term: 'iso',
        __columns: [
          {
            name: 'iso',
            type: 'string',
          },
          {
            name: 'population',
            type: 'number',
          },
        ],
      });

      const termField = tableSource.getTermField();
      expect(termField.getName()).toEqual('iso');
      expect(await termField.getDataType()).toEqual('string');
    });
  });

  describe('getRightFields', () => {
    it('should return columns', async () => {
      const tableSource = new TableSource({
        term: 'foobar',
        __columns: [
          {
            name: 'iso',
            type: 'string',
          },
          {
            name: 'population',
            type: 'number',
          },
        ],
      });

      const rightFields = tableSource.getRightFields();
      expect(rightFields[0].getName()).toEqual('iso');
      expect(await rightFields[0].getDataType()).toEqual('string');
      expect(rightFields[0].getOrigin()).toEqual(FIELD_ORIGIN.JOIN);
      expect(rightFields[0].getSource()).toEqual(tableSource);

      expect(rightFields[1].getName()).toEqual('population');
      expect(await rightFields[1].getDataType()).toEqual('number');
      expect(rightFields[1].getOrigin()).toEqual(FIELD_ORIGIN.JOIN);
      expect(rightFields[1].getSource()).toEqual(tableSource);
    });
  });

  describe('getFieldByName', () => {
    it('should return columns', async () => {
      const tableSource = new TableSource({
        term: 'foobar',
        __columns: [
          {
            name: 'iso',
            type: 'string',
          },
          {
            name: 'population',
            type: 'number',
          },
        ],
      });

      const field = tableSource.getFieldByName('iso');
      expect(field!.getName()).toEqual('iso');
      expect(await field!.getDataType()).toEqual('string');
      expect(field!.getOrigin()).toEqual(FIELD_ORIGIN.JOIN);
      expect(field!.getSource()).toEqual(tableSource);
    });
  });

  describe('getGeoJsonWithMeta', () => {
    it('should throw - not implemented', async () => {
      const tableSource = new TableSource({});

      let didThrow = false;
      try {
        await tableSource.getGeoJsonWithMeta(
          'foobar',
          {} as unknown as VectorSourceRequestMeta,
          () => {},
          () => {
            return false;
          }
        );
      } catch (e) {
        didThrow = true;
      } finally {
        expect(didThrow).toBe(true);
      }
    });
  });
});
