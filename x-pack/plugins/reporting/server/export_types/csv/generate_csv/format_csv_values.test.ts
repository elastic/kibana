/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { createFormatCsvValues } from './format_csv_values';

describe('formatCsvValues', function () {
  const separator = ',';
  const fields = ['foo', 'bar'];
  const mockEscapeValue = (value: any, index: number, array: any[]) => value || '';
  describe('with _source as one of the fields', function () {
    const formatsMap = new Map();
    const formatCsvValues = createFormatCsvValues(
      mockEscapeValue,
      separator,
      ['foo', '_source'],
      formatsMap
    );
    it('should return full _source for _source field', function () {
      const values = {
        foo: 'baz',
      };
      expect(formatCsvValues(values)).to.be('baz,{"foo":"baz"}');
    });
  });
  describe('without field formats', function () {
    const formatsMap = new Map();
    const formatCsvValues = createFormatCsvValues(mockEscapeValue, separator, fields, formatsMap);

    it('should use the specified separator', function () {
      expect(formatCsvValues({})).to.be(separator);
    });

    it('should replace null and undefined with empty strings', function () {
      const values = {
        foo: undefined,
        bar: null,
      };
      expect(formatCsvValues(values)).to.be(',');
    });

    it('should JSON.stringify objects', function () {
      const values = {
        foo: {
          baz: 'qux',
        },
      };
      expect(formatCsvValues(values)).to.be('{"baz":"qux"},');
    });

    it('should concatenate strings', function () {
      const values = {
        foo: 'baz',
        bar: 'qux',
      };
      expect(formatCsvValues(values)).to.be('baz,qux');
    });
  });

  describe('with field formats', function () {
    const mockFieldFormat = {
      convert: (val: string) => String(val).toUpperCase(),
    };
    const formatsMap = new Map();
    formatsMap.set('bar', mockFieldFormat);
    const formatCsvValues = createFormatCsvValues(mockEscapeValue, separator, fields, formatsMap);

    it('should replace null and undefined with empty strings', function () {
      const values = {
        foo: undefined,
        bar: null,
      };
      expect(formatCsvValues(values)).to.be(',');
    });

    it('should format value with appropriate FieldFormat', function () {
      const values = {
        foo: 'baz',
        bar: 'qux',
      };
      expect(formatCsvValues(values)).to.be('baz,QUX');
    });
  });
});
