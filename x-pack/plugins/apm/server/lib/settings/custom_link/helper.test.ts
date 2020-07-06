/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { fromESFormat, splitFilterValueByComma, toESFormat } from './helper';

describe('Custom link API helper', () => {
  describe('splitFilterValueByComma', () => {
    it('returns empty string when any value is provided', () => {
      expect(splitFilterValueByComma('')).toEqual([]);
    });
    it('removes white spaces', () => {
      expect(splitFilterValueByComma('foo, bar,   ')).toEqual(['foo', 'bar']);
      expect(splitFilterValueByComma('foo , bar ,  baz,  ')).toEqual([
        'foo',
        'bar',
        'baz',
      ]);
    });
    it('doesnt slipt when comma is not found', () => {
      expect(splitFilterValueByComma('foo bar')).toEqual(['foo bar']);
    });
    it('doesnt slipt with dot', () => {
      expect(splitFilterValueByComma('foo.bar. baz')).toEqual(['foo.bar. baz']);
    });
  });

  describe('fromESFormat', () => {
    it('converts without filters', () => {
      expect(
        fromESFormat({
          id: '123',
          '@timestamp': 455,
          label: 'foo',
          url: 'bar',
        })
      ).toEqual({
        id: '123',
        '@timestamp': 455,
        label: 'foo',
        url: 'bar',
        filters: [],
      });
    });
    it('converts with filters', () => {
      expect(
        fromESFormat({
          id: '123',
          '@timestamp': 455,
          label: 'foo',
          url: 'bar',
          'service.name': ['baz'],
          'transaction.name': ['quz', 'qux', 'quux'],
        })
      ).toEqual({
        id: '123',
        '@timestamp': 455,
        label: 'foo',
        url: 'bar',
        filters: [
          { key: 'service.name', value: 'baz' },
          { key: 'transaction.name', value: 'quz,qux,quux' },
        ],
      });
    });
    it('returns empty string when any filter value is provided', () => {
      expect(
        fromESFormat({
          id: '123',
          '@timestamp': 455,
          label: 'foo',
          url: 'bar',
          'service.name': [],
          'transaction.name': ['quz', 'qux', 'quux'],
        })
      ).toEqual({
        id: '123',
        '@timestamp': 455,
        label: 'foo',
        url: 'bar',
        filters: [
          { key: 'service.name', value: '' },
          { key: 'transaction.name', value: 'quz,qux,quux' },
        ],
      });
    });
  });

  describe('toESFormat', () => {
    it('converts without filters', () => {
      expect(
        toESFormat({
          label: 'foo',
          url: 'bar',
        })
      ).toEqual({
        label: 'foo',
        url: 'bar',
      });
    });
    it('converts with filters', () => {
      expect(
        toESFormat({
          label: 'foo',
          url: 'bar',
          filters: [
            { key: 'service.name', value: 'baz' },
            { key: 'transaction.name', value: 'quz,qux,quux' },
          ],
        })
      ).toEqual({
        label: 'foo',
        url: 'bar',
        'service.name': ['baz'],
        'transaction.name': ['quz', 'qux', 'quux'],
      });
    });
    it('removes filters without key or value', () => {
      expect(
        toESFormat({
          label: 'foo',
          url: 'bar',
          filters: [
            { key: '', value: 'baz' },
            { key: 'service.name', value: '' },
            { key: 'transaction.name', value: 'quz,qux,quux' },
          ],
        })
      ).toEqual({
        label: 'foo',
        url: 'bar',
        'transaction.name': ['quz', 'qux', 'quux'],
      });
    });
  });
});
