/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { act, renderHook } from '@testing-library/react-hooks';

import { BrowserFields } from '../../../../common/search_strategy/index_fields';
import {
  useFilteredBrowserFields,
  UseFilteredBrowserFieldsProps,
} from './use_filtered_fetch_index';
import { mockBrowserFields } from './mock';

describe('useFilteredBrowserFields', () => {
  test('initializes hook', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<
        UseFilteredBrowserFieldsProps,
        [BrowserFields | undefined]
      >(() =>
        useFilteredBrowserFields({
          browserFields: mockBrowserFields,
          filterByIndexes: ['filebeat'],
        })
      );

      await waitForNextUpdate();

      expect(result.current).toEqual([undefined]);
    });
  });

  test('it filters by indexes', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<
        UseFilteredBrowserFieldsProps,
        [BrowserFields | undefined]
      >(() =>
        useFilteredBrowserFields({
          browserFields: mockBrowserFields,
          filterByIndexes: ['endgame-*'],
        })
      );
      // NOTE: First `waitForNextUpdate` is initialization
      // Second call applies the params
      await waitForNextUpdate();
      await waitForNextUpdate();

      expect(result.current).toEqual([
        {
          agent: { fields: {} },
          auditd: { fields: {} },
          base: { fields: {} },
          client: { fields: {} },
          cloud: { fields: {} },
          container: { fields: {} },
          destination: { fields: {} },
          event: {
            fields: {
              'event.end': {
                aggregatable: true,
                category: 'event',
                description:
                  'event.end contains the date when the event ended or when the activity was last observed.',
                esTypes: ['date'],
                example: null,
                format: '',
                indexes: [
                  'apm-*-transaction*',
                  'auditbeat-*',
                  'endgame-*',
                  'filebeat-*',
                  'logs-*',
                  'packetbeat-*',
                  'winlogbeat-*',
                ],
                name: 'event.end',
                searchable: true,
                type: 'date',
              },
            },
          },
          source: { fields: {} },
        },
      ]);
    });
  });

  test('it filters by esType', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<
        UseFilteredBrowserFieldsProps,
        [BrowserFields | undefined]
      >(() =>
        useFilteredBrowserFields({
          browserFields: mockBrowserFields,
          filterByEsTypes: ['date'],
        })
      );
      // NOTE: First `waitForNextUpdate` is initialization
      // Second call applies the params
      await waitForNextUpdate();
      await waitForNextUpdate();

      expect(result.current).toEqual([
        {
          agent: { fields: {} },
          auditd: { fields: {} },
          base: {
            fields: {
              '@timestamp': {
                aggregatable: true,
                category: 'base',
                description:
                  'Date/time when the event originated. For log events this is the date/time when the event was generated, and not when it was read. Required field for all events.',
                esTypes: ['date'],
                example: '2016-05-23T08:05:34.853Z',
                format: '',
                indexes: ['auditbeat', 'filebeat', 'packetbeat'],
                name: '@timestamp',
                searchable: true,
                type: 'date',
              },
            },
          },
          client: { fields: {} },
          cloud: { fields: {} },
          container: { fields: {} },
          destination: { fields: {} },
          event: {
            fields: {
              'event.end': {
                aggregatable: true,
                category: 'event',
                description:
                  'event.end contains the date when the event ended or when the activity was last observed.',
                esTypes: ['date'],
                example: null,
                format: '',
                indexes: [
                  'apm-*-transaction*',
                  'auditbeat-*',
                  'endgame-*',
                  'filebeat-*',
                  'logs-*',
                  'packetbeat-*',
                  'winlogbeat-*',
                ],
                name: 'event.end',
                searchable: true,
                type: 'date',
              },
            },
          },
          source: { fields: {} },
        },
      ]);
    });
  });

  test('it filters by indexes and esType', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<
        UseFilteredBrowserFieldsProps,
        [BrowserFields | undefined]
      >(() =>
        useFilteredBrowserFields({
          browserFields: mockBrowserFields,
          filterByIndexes: ['auditbeat'],
          filterByEsTypes: ['date'],
        })
      );
      // NOTE: First `waitForNextUpdate` is initialization
      // Second call applies the params
      await waitForNextUpdate();
      await waitForNextUpdate();

      expect(result.current).toEqual([
        {
          agent: { fields: {} },
          auditd: { fields: {} },
          base: {
            fields: {
              '@timestamp': {
                aggregatable: true,
                category: 'base',
                description:
                  'Date/time when the event originated. For log events this is the date/time when the event was generated, and not when it was read. Required field for all events.',
                esTypes: ['date'],
                example: '2016-05-23T08:05:34.853Z',
                format: '',
                indexes: ['auditbeat', 'filebeat', 'packetbeat'],
                name: '@timestamp',
                searchable: true,
                type: 'date',
              },
            },
          },
          client: { fields: {} },
          cloud: { fields: {} },
          container: { fields: {} },
          destination: { fields: {} },
          event: { fields: {} },
          source: { fields: {} },
        },
      ]);
    });
  });
});
