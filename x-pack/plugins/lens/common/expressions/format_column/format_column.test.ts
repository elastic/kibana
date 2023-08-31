/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Datatable, DatatableColumn } from '@kbn/expressions-plugin/common';
import { functionWrapper } from '@kbn/expressions-plugin/common/expression_functions/specs/tests/utils';
import { formatColumn } from '.';

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
      params: { formatOverride: true, pattern: '0,0.00' },
    });
  });

  it('uses number of decimals if provided', async () => {
    datatable.columns[0].meta.params = { id: 'myformatter', params: {} };
    const result = await fn(datatable, { columnId: 'test', format: 'number', decimals: 5 });
    expect(result.columns[0].meta.params).toEqual({
      id: 'number',
      params: { formatOverride: true, pattern: '0,0.00000' },
    });
  });

  it('wraps in suffix formatter if provided', async () => {
    datatable.columns[0].meta.params = { id: 'myformatter', params: {} };
    const result = await fn(datatable, {
      columnId: 'test',
      format: 'number',
      decimals: 5,
      suffix: 'ABC',
    });
    expect(result.columns[0].meta.params).toEqual({
      id: 'suffix',
      params: {
        suffixString: 'ABC',
        id: 'number',
        formatOverride: true,
        params: { formatOverride: true, pattern: '0,0.00000' },
      },
    });
  });

  it('has special handling for 0 decimals', async () => {
    datatable.columns[0].meta.params = { id: 'myformatter', params: {} };
    const result = await fn(datatable, { columnId: 'test', format: 'number', decimals: 0 });
    expect(result.columns[0].meta.params).toEqual({
      id: 'number',
      params: { formatOverride: true, pattern: '0,0' },
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

    it('applies suffix formatter even if there is a parent format', async () => {
      datatable.columns[0].meta.params = {
        id: 'wrapper',
        params: { wrapperParam: 0, id: 'myformatter', params: { innerParam: 456 } },
      };
      const result = await fn(datatable, {
        columnId: 'test',
        format: '',
        suffix: 'abc',
        parentFormat: JSON.stringify({ id: 'wrapper', params: { wrapperParam: 123 } }),
      });
      expect(result.columns[0].meta.params).toEqual({
        id: 'suffix',
        params: {
          suffixString: 'abc',
          formatOverride: true,
          id: 'wrapper',
          params: {
            wrapperParam: 123,
            id: 'myformatter',
            params: {
              innerParam: 456,
            },
          },
        },
      });
    });

    it('double-nests suffix formatters', async () => {
      datatable.columns[0].meta.params = {
        id: 'suffix',
        params: { suffixString: 'ABC', id: 'myformatter', params: { innerParam: 456 } },
      };
      const result = await fn(datatable, {
        columnId: 'test',
        format: '',
        parentFormat: JSON.stringify({ id: 'suffix', params: { suffixString: 'DEF' } }),
      });
      expect(result.columns[0].meta.params).toEqual({
        id: 'suffix',
        params: {
          suffixString: 'DEF',
          id: 'suffix',
          params: {
            suffixString: 'ABC',
            id: 'myformatter',
            params: {
              innerParam: 456,
            },
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
          formatOverride: true,
          wrapperParam: 123,
          id: 'number',
          params: { formatOverride: true, pattern: '0,0.00000' },
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
              params: { formatOverride: true, pattern: '0,0.00000' },
              formatOverride: true,
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

  it('does support compact format', async () => {
    const result = await fn(datatable, {
      columnId: 'test',
      format: 'number',
      compact: true,
    });
    expect(result.columns[0].meta).toEqual({
      type: 'number',
      params: {
        id: 'number',
        params: { pattern: '0,0.00a', formatOverride: true },
      },
    });
  });

  it('does support a Lens custom format', async () => {
    const result = await fn(datatable, {
      columnId: 'test',
      format: 'custom',
      pattern: '00:00',
    });
    expect(result.columns[0].meta).toEqual({
      type: 'number',
      params: {
        id: 'number',
        params: { pattern: '00:00', formatOverride: true },
      },
    });
  });

  it('does support both decimals and compact format', async () => {
    const result = await fn(datatable, {
      columnId: 'test',
      format: 'number',
      decimals: 5,
      compact: true,
    });
    expect(result.columns[0].meta).toEqual({
      type: 'number',
      params: {
        id: 'number',
        params: { pattern: '0,0.00000a', formatOverride: true },
      },
    });
  });

  it("does not apply the custom pattern unless it's a custom format", async () => {
    const result = await fn(datatable, {
      columnId: 'test',
      format: 'number',
      pattern: '00:00',
    });
    expect(result.columns[0].meta).toEqual({
      type: 'number',
      params: {
        id: 'number',
        params: { pattern: '0,0.00', formatOverride: true },
      },
    });
  });

  it('does translate the duration params into native parameters', async () => {
    const result = await fn(datatable, {
      columnId: 'test',
      format: 'duration',
      fromUnit: 'seconds',
      toUnit: 'asHours',
      compact: true,
      decimals: 2,
    });

    expect(result.columns[0].meta).toEqual({
      type: 'number',
      params: {
        id: 'duration',
        params: {
          pattern: '',
          formatOverride: true,
          inputFormat: 'seconds',
          outputFormat: 'asHours',
          outputPrecision: 2,
          useShortSuffix: true,
          showSuffix: true,
          includeSpaceWithSuffix: true,
        },
      },
    });
  });

  it('should apply custom suffix to duration format when configured', async () => {
    const result = await fn(datatable, {
      columnId: 'test',
      format: 'duration',
      fromUnit: 'seconds',
      toUnit: 'asHours',
      compact: true,
      decimals: 2,
      suffix: ' on Earth',
    });
    expect(result.columns[0].meta).toEqual({
      type: 'number',
      params: {
        id: 'suffix',
        params: {
          suffixString: ' on Earth',
          id: 'duration',
          formatOverride: true,
          params: {
            pattern: '',
            formatOverride: true,
            inputFormat: 'seconds',
            outputFormat: 'asHours',
            outputPrecision: 2,
            useShortSuffix: true,
            showSuffix: true,
            includeSpaceWithSuffix: true,
          },
        },
      },
    });
  });
});
