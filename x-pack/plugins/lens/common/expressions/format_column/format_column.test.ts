/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Datatable, DatatableColumn } from 'src/plugins/expressions/public';
import { functionWrapper } from 'src/plugins/expressions/common/expression_functions/specs/tests/utils';
import { formatColumn } from './index';

describe('format_column', () => {
  const fn = functionWrapper(formatColumn);

  let datatable: Datatable;

  beforeEach(() => {
    datatable = {
      type: 'datatable',
      rows: [],
      columns: [
        {
          id: 'test',
          name: 'test',
          meta: {
            type: 'number',
            params: {
              id: 'number',
            },
          },
        },
      ],
    };
  });

  it('overwrites format', async () => {
    datatable.columns[0].meta.params = { id: 'myformatter', params: {} };
    const result = await fn(datatable, { columnId: 'test', format: 'otherformatter' });
    expect(result.columns[0].meta.params).toEqual({
      id: 'otherformatter',
    });
  });

  it('overwrites format with well known pattern', async () => {
    datatable.columns[0].meta.params = { id: 'myformatter', params: {} };
    const result = await fn(datatable, { columnId: 'test', format: 'number' });
    expect(result.columns[0].meta.params).toEqual({
      id: 'number',
      params: {
        pattern: '0,0.00',
      },
    });
  });

  it('uses number of decimals if provided', async () => {
    datatable.columns[0].meta.params = { id: 'myformatter', params: {} };
    const result = await fn(datatable, { columnId: 'test', format: 'number', decimals: 5 });
    expect(result.columns[0].meta.params).toEqual({
      id: 'number',
      params: {
        pattern: '0,0.00000',
      },
    });
  });

  it('has special handling for 0 decimals', async () => {
    datatable.columns[0].meta.params = { id: 'myformatter', params: {} };
    const result = await fn(datatable, { columnId: 'test', format: 'number', decimals: 0 });
    expect(result.columns[0].meta.params).toEqual({
      id: 'number',
      params: {
        pattern: '0,0',
      },
    });
  });

  describe('parent format', () => {
    it('should ignore parent format if it is not specifying an id', async () => {
      const result = await fn(datatable, {
        columnId: 'test',
        format: '',
        parentFormat: JSON.stringify({ some: 'key' }),
      });
      expect(result.columns[0].meta.params).toEqual(datatable.columns[0].meta.params);
    });

    it('set parent format with params', async () => {
      const result = await fn(datatable, {
        columnId: 'test',
        format: '',
        parentFormat: JSON.stringify({ id: 'wrapper', params: { wrapperParam: 123 } }),
      });
      expect(result.columns[0].meta.params).toEqual({
        id: 'wrapper',
        params: {
          wrapperParam: 123,
          id: 'number',
        },
      });
    });

    it('retain inner formatter params', async () => {
      datatable.columns[0].meta.params = { id: 'myformatter', params: { innerParam: 456 } };
      const result = await fn(datatable, {
        columnId: 'test',
        format: '',
        parentFormat: JSON.stringify({ id: 'wrapper', params: { wrapperParam: 123 } }),
      });
      expect(result.columns[0].meta.params).toEqual({
        id: 'wrapper',
        params: {
          wrapperParam: 123,
          id: 'myformatter',
          params: {
            innerParam: 456,
          },
        },
      });
    });

    it('overwrite existing wrapper param', async () => {
      datatable.columns[0].meta.params = {
        id: 'wrapper',
        params: { wrapperParam: 0, id: 'myformatter', params: { innerParam: 456 } },
      };
      const result = await fn(datatable, {
        columnId: 'test',
        format: '',
        parentFormat: JSON.stringify({ id: 'wrapper', params: { wrapperParam: 123 } }),
      });
      expect(result.columns[0].meta.params).toEqual({
        id: 'wrapper',
        params: {
          wrapperParam: 123,
          id: 'myformatter',
          params: {
            innerParam: 456,
          },
        },
      });
    });

    it('overwrites format with well known pattern including decimals', async () => {
      datatable.columns[0].meta.params = {
        id: 'previousWrapper',
        params: { id: 'myformatter', params: { innerParam: 456 } },
      };
      const result = await fn(datatable, {
        columnId: 'test',
        format: 'number',
        decimals: 5,
        parentFormat: JSON.stringify({ id: 'wrapper', params: { wrapperParam: 123 } }),
      });
      expect(result.columns[0].meta.params).toEqual({
        id: 'wrapper',
        params: {
          wrapperParam: 123,
          id: 'number',
          params: {
            pattern: '0,0.00000',
          },
          pattern: '0,0.00000',
        },
      });
    });

    it('should support multi-fields formatters', async () => {
      datatable.columns[0].meta.params = {
        id: 'previousWrapper',
        params: { id: 'myMultiFieldFormatter', paramsPerField: [{ id: 'number' }] },
      };
      const result = await fn(datatable, {
        columnId: 'test',
        format: 'number',
        decimals: 5,
        parentFormat: JSON.stringify({ id: 'wrapper', params: { wrapperParam: 123 } }),
      });
      expect(result.columns[0].meta.params).toEqual({
        id: 'wrapper',
        params: {
          wrapperParam: 123,
          id: 'number',
          paramsPerField: [
            {
              id: 'number',
              params: {
                pattern: '0,0.00000',
              },
              pattern: '0,0.00000',
            },
          ],
        },
      });
    });
  });

  it('does not touch other column meta data', async () => {
    const extraColumn: DatatableColumn = { id: 'test2', name: 'test2', meta: { type: 'number' } };
    datatable.columns.push(extraColumn);
    const result = await fn(datatable, { columnId: 'test', format: 'number' });
    expect(result.columns[1]).toEqual(extraColumn);
  });
});
