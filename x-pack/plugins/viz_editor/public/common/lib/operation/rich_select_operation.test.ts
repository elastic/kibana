/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CountOperation, DateHistogramOperation, TermsOperation } from '../../../../common';
import { Datasource } from '../../../../public';
import { RichSelectOperation } from './rich_select_operation';

describe('RichSelectOperation', () => {
  let datasource: Datasource;

  beforeEach(() => {
    datasource = {
      fields: [
        {
          name: 'timestamp',
          type: 'date',
          aggregatable: true,
          searchable: true,
        },
        {
          name: 'collector',
          type: 'string',
          aggregatable: true,
          searchable: true,
        },
      ],
      title: '',
      id: '',
    };
  });

  describe('constructor', () => {
    it('should construct a valid count operation', () => {
      const operation = new RichSelectOperation('count', null, datasource);
      expect(operation.toObject()).toEqual({ operator: 'count', argument: {}, alias: 'count' });
    });

    it('should construct a valid date_histogram operation', () => {
      const operation = new RichSelectOperation('date_histogram', 'timestamp', datasource);
      expect(operation.toObject()).toEqual({
        operator: 'date_histogram',
        argument: {
          field: 'timestamp',
          interval: '1d',
        },
        alias: 'timestamp',
      });
    });

    it('should throw on object conversion without datasource', () => {
      const operation = new RichSelectOperation('terms', 'collector');

      expect(() => {
        operation.toObject();
      }).toThrow('datasource');
    });
  });

  describe('fromObject', () => {
    it('should initialize count operations from object', () => {
      const input = { operator: 'count', argument: {} } as CountOperation;
      const operation = RichSelectOperation.fromObject(input);

      expect(operation.operator).toBe('count');
      expect(operation.isValid()).toBe(true);
      expect(operation.toObject()).toEqual({
        operator: 'count',
        argument: {},
        alias: 'count',
      });
    });

    it('should initialize date_histogram operations from object', () => {
      const input = {
        operator: 'date_histogram',
        argument: {
          field: 'timestamp',
          interval: '1d',
        },
      } as DateHistogramOperation;
      const operation = RichSelectOperation.fromObject(input, datasource);

      expect(operation.operator).toBe('date_histogram');
      expect(operation.isValid()).toBe(true);
      expect(operation.toObject()).toEqual({
        operator: 'date_histogram',
        argument: {
          field: 'timestamp',
          interval: '1d',
        },
        alias: 'timestamp',
      });
    });

    it('should throw on conversion to object without datasource', () => {
      const input = { operator: 'terms', argument: { field: 'collector' } } as TermsOperation;
      const operation = RichSelectOperation.fromObject(input);

      expect(() => {
        operation.toObject();
      }).toThrow('datasource');
    });
  });
});
