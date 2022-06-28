/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { omit } from 'lodash/fp';

import { ColumnHeaderOptions } from '../../../../common/types';
import {
  allowSorting,
  hasCellActions,
  mapSortDirectionToDirection,
  mapSortingColumns,
  addBuildingBlockStyle,
} from './helpers';

import { euiThemeVars } from '@kbn/ui-theme';
import { mockDnsEvent } from '../../../mock';

describe('helpers', () => {
  describe('mapSortDirectionToDirection', () => {
    test('it returns the expected direction when sortDirection is `asc`', () => {
      expect(mapSortDirectionToDirection('asc')).toBe('asc');
    });

    test('it returns the expected direction when sortDirection is `desc`', () => {
      expect(mapSortDirectionToDirection('desc')).toBe('desc');
    });

    test('it returns the expected direction when sortDirection is `none`', () => {
      expect(mapSortDirectionToDirection('none')).toBe('desc'); // defaults to a valid direction accepted by `EuiDataGrid`
    });
  });

  describe('mapSortingColumns', () => {
    const columns: Array<{
      id: string;
      direction: 'asc' | 'desc';
    }> = [
      {
        id: 'kibana.rac.alert.status',
        direction: 'asc',
      },
      {
        id: 'kibana.rac.alert.start',
        direction: 'desc',
      },
    ];

    const columnHeaders: ColumnHeaderOptions[] = [
      {
        columnHeaderType: 'not-filtered',
        displayAsText: 'Status',
        id: 'kibana.rac.alert.status',
        initialWidth: 79,
        category: 'kibana',
        type: 'string',
        aggregatable: true,
        actions: {
          showSortAsc: {
            label: 'Sort A-Z',
          },
          showSortDesc: {
            label: 'Sort Z-A',
          },
        },
        defaultSortDirection: 'desc',
        display: {
          key: null,
          ref: null,
          props: {
            children: {
              key: null,
              ref: null,
              props: {
                children: 'Status',
              },
              _owner: null,
            },
          },
          _owner: null,
        },
        isSortable: true,
      },
      {
        columnHeaderType: 'not-filtered',
        displayAsText: 'Triggered',
        id: 'kibana.rac.alert.start',
        initialWidth: 176,
        category: 'kibana',
        type: 'date',
        esTypes: ['date'],
        aggregatable: true,
        actions: {
          showSortAsc: {
            label: 'Sort A-Z',
          },
          showSortDesc: {
            label: 'Sort Z-A',
          },
        },
        defaultSortDirection: 'desc',
        display: {
          key: null,
          ref: null,
          props: {
            children: {
              key: null,
              ref: null,
              props: {
                children: 'Triggered',
              },
              _owner: null,
            },
          },
          _owner: null,
        },
        isSortable: true,
      },
    ];

    test('it returns the expected results when each column has a corresponding entry in `columnHeaders`', () => {
      expect(mapSortingColumns({ columns, columnHeaders })).toEqual([
        {
          columnId: 'kibana.rac.alert.status',
          columnType: 'string',
          esTypes: [],
          sortDirection: 'asc',
        },
        {
          columnId: 'kibana.rac.alert.start',
          columnType: 'date',
          esTypes: ['date'],
          sortDirection: 'desc',
        },
      ]);
    });

    test('it defaults to a `columnType` of empty string when a column does NOT have a corresponding entry in `columnHeaders`', () => {
      const withUnknownColumn: Array<{
        id: string;
        direction: 'asc' | 'desc';
      }> = [
        {
          id: 'kibana.rac.alert.status',
          direction: 'asc',
        },
        {
          id: 'kibana.rac.alert.start',
          direction: 'desc',
        },
        {
          id: 'unknown', // <-- no entry for this in `columnHeaders`
          direction: 'asc',
        },
      ];

      expect(mapSortingColumns({ columns: withUnknownColumn, columnHeaders })).toEqual([
        {
          columnId: 'kibana.rac.alert.status',
          columnType: 'string',
          esTypes: [],
          sortDirection: 'asc',
        },
        {
          columnId: 'kibana.rac.alert.start',
          columnType: 'date',
          esTypes: ['date'],
          sortDirection: 'desc',
        },
        {
          columnId: 'unknown',
          columnType: '', // <-- mapped to the default
          esTypes: [], // <-- mapped to the default
          sortDirection: 'asc',
        },
      ]);
    });
  });

  describe('allowSorting', () => {
    const aggregatableField = {
      category: 'cloud',
      description:
        'The cloud account or organization id used to identify different entities in a multi-tenant environment. Examples: AWS account id, Google Cloud ORG Id, or other unique identifier.',
      example: '666777888999',
      indexes: ['auditbeat', 'filebeat', 'packetbeat'],
      name: 'cloud.account.id',
      searchable: true,
      type: 'string',
      aggregatable: true, // <-- allow sorting when this is true
      format: '',
    };

    test('it returns true for an aggregatable field', () => {
      expect(
        allowSorting({
          browserField: aggregatableField,
          fieldName: aggregatableField.name,
        })
      ).toBe(true);
    });

    test('it returns true for a allow-listed non-BrowserField', () => {
      expect(
        allowSorting({
          browserField: undefined, // no BrowserField metadata for this field
          fieldName: 'kibana.alert.rule.name', //  an allow-listed field name
        })
      ).toBe(true);
    });

    test('it returns false for a NON-aggregatable field (aggregatable is false)', () => {
      const nonaggregatableField = {
        ...aggregatableField,
        aggregatable: false, // <-- NON-aggregatable
      };

      expect(
        allowSorting({
          browserField: nonaggregatableField,
          fieldName: nonaggregatableField.name,
        })
      ).toBe(false);
    });

    test('it returns false if the BrowserField is missing the aggregatable property', () => {
      const missingAggregatable = omit('aggregatable', aggregatableField);

      expect(
        allowSorting({
          browserField: missingAggregatable,
          fieldName: missingAggregatable.name,
        })
      ).toBe(false);
    });

    test("it returns false for a non-allowlisted field we don't have `BrowserField` metadata for it", () => {
      expect(
        allowSorting({
          browserField: undefined, // <-- no metadata for this field
          fieldName: 'non-allowlisted',
        })
      ).toBe(false);
    });
  });

  describe('addBuildingBlockStyle', () => {
    const THEME = { eui: euiThemeVars, darkMode: false };

    test('it calls `setCellProps` with background color when event is a building block', () => {
      const mockedSetCellProps = jest.fn();
      const ecs = {
        ...mockDnsEvent,
        ...{ kibana: { alert: { building_block_type: ['default'] } } },
      };

      addBuildingBlockStyle(ecs, THEME, mockedSetCellProps);

      expect(mockedSetCellProps).toBeCalledWith({
        style: {
          backgroundColor: euiThemeVars.euiColorHighlight,
        },
      });
    });

    test('it call `setCellProps` reseting the background color when event is not a building block', () => {
      const mockedSetCellProps = jest.fn();

      addBuildingBlockStyle(mockDnsEvent, THEME, mockedSetCellProps);

      expect(mockedSetCellProps).toBeCalledWith({ style: { backgroundColor: 'inherit' } });
    });
  });

  describe('hasCellActions', () => {
    const columnId = '@timestamp';

    test('it returns false when the columnId is included in `disabledCellActions` ', () => {
      const disabledCellActions = ['foo', '@timestamp', 'bar', 'baz']; // includes @timestamp

      expect(hasCellActions({ columnId, disabledCellActions })).toBe(false);
    });

    test('it returns true when the columnId is NOT included in `disabledCellActions` ', () => {
      const disabledCellActions = ['foo', 'bar', 'baz'];

      expect(hasCellActions({ columnId, disabledCellActions })).toBe(true);
    });
  });
});
