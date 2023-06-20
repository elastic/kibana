/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mockedServices, TestProvidersComponent } from '../../../mocks/test_providers';
import { act, renderHook } from '@testing-library/react-hooks';
import { useColumnSettings } from './use_column_settings';

const renderUseColumnSettings = () =>
  renderHook(() => useColumnSettings(), { wrapper: TestProvidersComponent });

describe('useColumnSettings()', () => {
  afterEach(() => mockedServices.storage.clear());

  describe('initial state', () => {
    describe('when initial state is not persisted into plugin storage service', () => {
      it('should return correct value', () => {
        const { result } = renderUseColumnSettings();

        expect(result.current.columns).toMatchInlineSnapshot(`
          Array [
            Object {
              "displayAsText": "@timestamp",
              "id": "@timestamp",
            },
            Object {
              "displayAsText": "Indicator",
              "id": "threat.indicator.name",
            },
            Object {
              "displayAsText": "Indicator type",
              "id": "threat.indicator.type",
            },
            Object {
              "displayAsText": "Feed",
              "id": "threat.feed.name",
            },
            Object {
              "displayAsText": "First seen",
              "id": "threat.indicator.first_seen",
            },
            Object {
              "displayAsText": "Last seen",
              "id": "threat.indicator.last_seen",
            },
          ]
        `);

        expect(result.current.columnVisibility.visibleColumns).toMatchInlineSnapshot(`
          Array [
            "@timestamp",
            "threat.indicator.name",
            "threat.indicator.type",
            "threat.feed.name",
            "threat.indicator.first_seen",
            "threat.indicator.last_seen",
          ]
        `);

        expect(result.current.sorting.columns).toMatchInlineSnapshot(`Array []`);
      });
    });

    describe('when initial state is present in the plugin storage service', () => {
      beforeEach(() => {
        mockedServices.storage.set('indicatorsTable', {
          visibleColumns: ['threat.indicator.name', 'threat.indicator.last_seen', 'tags', 'stream'],
          columns: [
            { id: 'threat.indicator.name', displayAsText: 'Indicator' },
            { id: 'threat.indicator.type', displayAsText: 'Indicator type' },
            { id: 'threat.feed.name', displayAsText: 'Feed' },
            { id: 'threat.indicator.first_seen', displayAsText: 'First seen' },
            { id: 'threat.indicator.last_seen', displayAsText: 'Last seen' },
            { id: 'tags', displayAsText: 'tags' },
            { id: 'stream', displayAsText: 'stream' },
          ],
          sortingState: {
            columns: [
              {
                id: 'threat.indicator.name',
                direction: 'asc',
              },
            ],
          },
        });
      });

      it('should restore the column settings from the cache', () => {
        const { result } = renderUseColumnSettings();

        expect(result.current.columnVisibility.visibleColumns).toMatchInlineSnapshot(`
          Array [
            "threat.indicator.name",
            "threat.indicator.last_seen",
            "tags",
            "stream",
          ]
        `);

        expect(result.current.columns).toMatchInlineSnapshot(`
          Array [
            Object {
              "displayAsText": "Indicator",
              "id": "threat.indicator.name",
            },
            Object {
              "displayAsText": "Indicator type",
              "id": "threat.indicator.type",
            },
            Object {
              "displayAsText": "Feed",
              "id": "threat.feed.name",
            },
            Object {
              "displayAsText": "First seen",
              "id": "threat.indicator.first_seen",
            },
            Object {
              "displayAsText": "Last seen",
              "id": "threat.indicator.last_seen",
            },
            Object {
              "displayAsText": "tags",
              "id": "tags",
            },
            Object {
              "displayAsText": "stream",
              "id": "stream",
            },
          ]
        `);

        expect(result.current.sorting.columns).toMatchInlineSnapshot(`
          Object {
            "columns": Array [
              Object {
                "direction": "asc",
                "id": "threat.indicator.name",
              },
            ],
          }
        `);
      });
    });
  });

  describe('column toggle and reset', () => {
    it('should return correct columns list', async () => {
      const { result } = renderUseColumnSettings();

      expect(result.current.columnVisibility.visibleColumns).toMatchInlineSnapshot(`
        Array [
          "@timestamp",
          "threat.indicator.name",
          "threat.indicator.type",
          "threat.feed.name",
          "threat.indicator.first_seen",
          "threat.indicator.last_seen",
        ]
      `);
      expect(result.current.columns).toMatchInlineSnapshot(`
        Array [
          Object {
            "displayAsText": "@timestamp",
            "id": "@timestamp",
          },
          Object {
            "displayAsText": "Indicator",
            "id": "threat.indicator.name",
          },
          Object {
            "displayAsText": "Indicator type",
            "id": "threat.indicator.type",
          },
          Object {
            "displayAsText": "Feed",
            "id": "threat.feed.name",
          },
          Object {
            "displayAsText": "First seen",
            "id": "threat.indicator.first_seen",
          },
          Object {
            "displayAsText": "Last seen",
            "id": "threat.indicator.last_seen",
          },
        ]
      `);

      await act(async () => {
        result.current.handleToggleColumn('justATestColumn');
      });

      expect(result.current.columnVisibility.visibleColumns).toMatchInlineSnapshot(`
        Array [
          "@timestamp",
          "threat.indicator.name",
          "threat.indicator.type",
          "threat.feed.name",
          "threat.indicator.first_seen",
          "threat.indicator.last_seen",
          "justATestColumn",
        ]
      `);
      expect(result.current.columns).toMatchInlineSnapshot(`
        Array [
          Object {
            "displayAsText": "@timestamp",
            "id": "@timestamp",
          },
          Object {
            "displayAsText": "Indicator",
            "id": "threat.indicator.name",
          },
          Object {
            "displayAsText": "Indicator type",
            "id": "threat.indicator.type",
          },
          Object {
            "displayAsText": "Feed",
            "id": "threat.feed.name",
          },
          Object {
            "displayAsText": "First seen",
            "id": "threat.indicator.first_seen",
          },
          Object {
            "displayAsText": "Last seen",
            "id": "threat.indicator.last_seen",
          },
          Object {
            "displayAsText": "justATestColumn",
            "id": "justATestColumn",
          },
        ]
      `);

      await act(async () => {
        result.current.handleResetColumns();
      });

      expect(result.current.columnVisibility.visibleColumns).toMatchInlineSnapshot(`
        Array [
          "@timestamp",
          "threat.indicator.name",
          "threat.indicator.type",
          "threat.feed.name",
          "threat.indicator.first_seen",
          "threat.indicator.last_seen",
        ]
      `);
      expect(result.current.columns).toMatchInlineSnapshot(`
        Array [
          Object {
            "displayAsText": "@timestamp",
            "id": "@timestamp",
          },
          Object {
            "displayAsText": "Indicator",
            "id": "threat.indicator.name",
          },
          Object {
            "displayAsText": "Indicator type",
            "id": "threat.indicator.type",
          },
          Object {
            "displayAsText": "Feed",
            "id": "threat.feed.name",
          },
          Object {
            "displayAsText": "First seen",
            "id": "threat.indicator.first_seen",
          },
          Object {
            "displayAsText": "Last seen",
            "id": "threat.indicator.last_seen",
          },
        ]
      `);
    });
  });

  describe('sorting', () => {
    it('should update internal state when onSort is called', async () => {
      const { result } = renderUseColumnSettings();

      expect(result.current.sorting.columns).toMatchInlineSnapshot(`Array []`);

      await act(async () => {
        result.current.sorting.onSort([{ id: 'threat.indicator.name', direction: 'asc' }]);
      });

      expect(result.current.sorting.columns).toMatchInlineSnapshot(`
        Array [
          Object {
            "direction": "asc",
            "id": "threat.indicator.name",
          },
        ]
      `);
    });
  });
});
