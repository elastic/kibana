/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Index } from '../../../common';
import { ExtensionsService } from '@kbn/index-management';
import { sortTable } from './sort_table';
describe('sortTable', () => {
  describe('sorts by name', () => {
    const indices = [{ name: 'test1' }, { name: 'test2' }] as Index[];
    it('ascending', () => {
      const sorted = sortTable(indices, 'name', true);
      expect(sorted).toEqual([{ name: 'test1' }, { name: 'test2' }]);
    });
    it('descending', () => {
      const sorted = sortTable(indices, 'name', false);
      expect(sorted).toEqual([{ name: 'test2' }, { name: 'test1' }]);
    });
  });

  describe('sorts by status', () => {
    const indices = [{ status: 'open' }, { status: 'close' }] as Index[];
    it('ascending', () => {
      const sorted = sortTable(indices, 'status', true);
      expect(sorted).toEqual([{ status: 'close' }, { status: 'open' }]);
    });
    it('descending', () => {
      const sorted = sortTable(indices, 'status', false);
      expect(sorted).toEqual([{ status: 'open' }, { status: 'close' }]);
    });
  });

  describe('sorts by health', () => {
    const indices = [{ health: 'green' }, { health: 'yellow' }, { health: 'red' }] as Index[];
    it('ascending', () => {
      const sorted = sortTable(indices, 'health', true);
      expect(sorted).toEqual([{ health: 'green' }, { health: 'red' }, { health: 'yellow' }]);
    });
    it('descending', () => {
      const sorted = sortTable(indices, 'health', false);
      expect(sorted).toEqual([{ health: 'yellow' }, { health: 'red' }, { health: 'green' }]);
    });
  });

  describe('sorts by primary', () => {
    const indices = [{ primary: '1' }, { primary: '12' }, { primary: '2' }] as Index[];
    it('ascending', () => {
      const sorted = sortTable(indices, 'primary', true);
      expect(sorted).toEqual([{ primary: '1' }, { primary: '2' }, { primary: '12' }]);
    });
    it('descending', () => {
      const sorted = sortTable(indices, 'primary', false);
      expect(sorted).toEqual([{ primary: '12' }, { primary: '2' }, { primary: '1' }]);
    });
  });

  describe('sorts by replica', () => {
    const indices = [{ replica: '1' }, { replica: '12' }, { replica: '2' }] as Index[];
    it('ascending', () => {
      const sorted = sortTable(indices, 'replica', true);
      expect(sorted).toEqual([{ replica: '1' }, { replica: '2' }, { replica: '12' }]);
    });
    it('descending', () => {
      const sorted = sortTable(indices, 'replica', false);
      expect(sorted).toEqual([{ replica: '12' }, { replica: '2' }, { replica: '1' }]);
    });
  });

  describe('sorts by documents', () => {
    const indices = [{ documents: 1 }, { documents: 12 }, { documents: 2 }] as Index[];
    it('ascending', () => {
      const sorted = sortTable(indices, 'documents', true);
      expect(sorted).toEqual([{ documents: 1 }, { documents: 2 }, { documents: 12 }]);
    });
    it('descending', () => {
      const sorted = sortTable(indices, 'documents', false);
      expect(sorted).toEqual([{ documents: 12 }, { documents: 2 }, { documents: 1 }]);
    });
  });

  describe('sorts by size', () => {
    const indices = [{ size: '248b' }, { size: '2.35mb' }, { size: '6.36kb' }] as Index[];
    it('ascending', () => {
      const sorted = sortTable(indices, 'size', true);
      expect(sorted).toEqual([{ size: '248b' }, { size: '6.36kb' }, { size: '2.35mb' }]);
    });
    it('descending', () => {
      const sorted = sortTable(indices, 'size', false);
      expect(sorted).toEqual([{ size: '2.35mb' }, { size: '6.36kb' }, { size: '248b' }]);
    });
  });

  describe('sorts by primary_size', () => {
    const indices = [
      { primary_size: '248b' },
      { primary_size: '2.35mb' },
      { primary_size: '6.36kb' },
    ] as Index[];
    it('ascending', () => {
      const sorted = sortTable(indices, 'primary_size', true);
      expect(sorted).toEqual([
        { primary_size: '248b' },
        { primary_size: '6.36kb' },
        { primary_size: '2.35mb' },
      ]);
    });
    it('descending', () => {
      const sorted = sortTable(indices, 'primary_size', false);
      expect(sorted).toEqual([
        { primary_size: '2.35mb' },
        { primary_size: '6.36kb' },
        { primary_size: '248b' },
      ]);
    });
  });

  describe('sorts by data_stream', () => {
    const indices = [
      { data_stream: 'test1' },
      { data_stream: undefined },
      { data_stream: 'test2' },
    ] as Index[];
    it('ascending', () => {
      const sorted = sortTable(indices, 'data_stream', true);
      expect(sorted).toEqual([
        { data_stream: 'test1' },
        { data_stream: 'test2' },
        { data_stream: undefined },
      ]);
    });
    it('descending', () => {
      const sorted = sortTable(indices, 'data_stream', false);
      expect(sorted).toEqual([
        { data_stream: undefined },
        { data_stream: 'test2' },
        { data_stream: 'test1' },
      ]);
    });
  });

  describe('sorts by a column added via extensions service', () => {
    const indices = [
      { ilm: { phase: 'hot' } },
      { ilm: { phase: 'warm' } },
      { ilm: { phase: undefined } },
    ] as Index[];
    const extensionsService = {
      columns: [
        {
          fieldName: 'ilm.phase',
          label: 'ILM phase',
          order: 10,
          render: (index: Index) => (index.ilm?.managed ? index.ilm.phase : ''),
          sort: (index: Index) => (index.ilm?.managed ? index.ilm.phase : ''),
        },
      ],
    } as ExtensionsService;
    it('ascending', () => {
      const sorted = sortTable(indices, 'ilm.phase', true, extensionsService);
      expect(sorted).toEqual([
        { ilm: { phase: 'hot' } },
        { ilm: { phase: 'warm' } },
        { ilm: { phase: undefined } },
      ]);
    });
    it('descending', () => {
      const sorted = sortTable(indices, 'ilm.phase', false, extensionsService);
      expect(sorted).toEqual([
        { ilm: { phase: undefined } },
        { ilm: { phase: 'warm' } },
        { ilm: { phase: 'hot' } },
      ]);
    });
  });
  describe('sorting by a column without a sorter', () => {
    const indices = [
      { test: 'test1' },
      { test: 'test2' },
      { test: undefined },
      { test: 'test5' },
      { test: 'test3' },
      { test: undefined },
    ] as unknown as Index[];
    it('ascending', () => {
      const sorted = sortTable(indices, 'test', true);
      expect(sorted).toEqual([
        { test: 'test1' },
        { test: 'test2' },
        { test: 'test3' },
        { test: 'test5' },
        { test: undefined },
        { test: undefined },
      ]);
    });
    it('descending', () => {
      const sorted = sortTable(indices, 'test', false);
      expect(sorted).toEqual([
        { test: undefined },
        { test: undefined },
        { test: 'test5' },
        { test: 'test3' },
        { test: 'test2' },
        { test: 'test1' },
      ]);
    });
  });
});
