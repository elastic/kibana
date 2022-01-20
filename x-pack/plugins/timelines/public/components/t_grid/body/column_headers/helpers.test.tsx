/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { euiThemeVars } from '@kbn/ui-theme';
import { mount } from 'enzyme';
import { omit, set } from 'lodash/fp';
import React from 'react';

import { defaultHeaders } from './default_headers';
import {
  BUILT_IN_SCHEMA,
  getActionsColumnWidth,
  getColumnWidthFromType,
  getColumnHeaders,
  getSchema,
} from './helpers';
import {
  DEFAULT_ACTION_BUTTON_WIDTH,
  DEFAULT_COLUMN_MIN_WIDTH,
  DEFAULT_DATE_COLUMN_MIN_WIDTH,
} from '../constants';
import { mockBrowserFields } from '../../../../mock/browser_fields';
import { ColumnHeaderOptions } from '../../../../../common/types';

window.matchMedia = jest.fn().mockImplementation((query) => {
  return {
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
  };
});

describe('helpers', () => {
  describe('getColumnWidthFromType', () => {
    test('it returns the expected width for a non-date column', () => {
      expect(getColumnWidthFromType('keyword')).toEqual(DEFAULT_COLUMN_MIN_WIDTH);
    });

    test('it returns the expected width for a date column', () => {
      expect(getColumnWidthFromType('date')).toEqual(DEFAULT_DATE_COLUMN_MIN_WIDTH);
    });
  });

  describe('getSchema', () => {
    const expected: Record<string, BUILT_IN_SCHEMA> = {
      date: 'datetime',
      date_nanos: 'datetime',
      double: 'numeric',
      long: 'numeric',
      number: 'numeric',
      object: 'json',
      boolean: 'boolean',
    };

    Object.keys(expected).forEach((type) =>
      test(`it returns the expected schema for type '${type}'`, () => {
        expect(getSchema(type)).toEqual(expected[type]);
      })
    );

    test('it returns `undefined` when `type` does NOT match a built-in schema type', () => {
      expect(getSchema('string')).toBeUndefined(); // 'keyword` doesn't have a schema
    });

    test('it returns `undefined` when `type` is undefined', () => {
      expect(getSchema(undefined)).toBeUndefined();
    });
  });

  describe('getColumnHeaders', () => {
    // additional properties used by `EuiDataGrid`:
    const actions = {
      showHide: false,
      showSortAsc: true,
      showSortDesc: true,
    };
    const defaultSortDirection = 'desc';
    const isSortable = true;

    const mockHeader = defaultHeaders.filter((h) =>
      ['@timestamp', 'source.ip', 'destination.ip'].includes(h.id)
    );

    describe('display', () => {
      const renderedByDisplay = 'I am rendered via a React component: header.display';
      const renderedByDisplayAsText = 'I am rendered by header.displayAsText';

      test('it renders via `display` when the header has JUST a `display` property (`displayAsText` is undefined)', () => {
        const headerWithJustDisplay = mockHeader.map((x) =>
          x.id === '@timestamp'
            ? {
                ...x,
                display: <span>{renderedByDisplay}</span>,
              }
            : x
        );

        const wrapper = mount(
          <>{getColumnHeaders(headerWithJustDisplay, mockBrowserFields)[0].display}</>
        );

        expect(wrapper.text()).toEqual(renderedByDisplay);
      });

      test('it (also) renders via `display` when the header has BOTH a `display` property AND a `displayAsText`', () => {
        const headerWithBoth = mockHeader.map((x) =>
          x.id === '@timestamp'
            ? {
                ...x,
                display: <span>{renderedByDisplay}</span>, // this has a higher priority...
                displayAsText: renderedByDisplayAsText, // ...so this text won't be rendered
              }
            : x
        );

        const wrapper = mount(
          <>{getColumnHeaders(headerWithBoth, mockBrowserFields)[0].display}</>
        );

        expect(wrapper.text()).toEqual(renderedByDisplay);
      });

      test('it renders via `displayAsText` when the header does NOT have a `display`, BUT it has `displayAsText`', () => {
        const headerWithJustDisplayAsText = mockHeader.map((x) =>
          x.id === '@timestamp'
            ? {
                ...x,
                displayAsText: renderedByDisplayAsText, // fallback to rendering via displayAsText
              }
            : x
        );

        const wrapper = mount(
          <>{getColumnHeaders(headerWithJustDisplayAsText, mockBrowserFields)[0].display}</>
        );

        expect(wrapper.text()).toEqual(renderedByDisplayAsText);
      });

      test('it renders `header.id` when the header does NOT have a `display`, AND it does NOT have a `displayAsText`', () => {
        const wrapper = mount(<>{getColumnHeaders(mockHeader, mockBrowserFields)[0].display}</>);

        expect(wrapper.text()).toEqual('@timestamp'); // fallback to rendering by header.id
      });
    });

    test('it renders the default actions when the header does NOT have custom actions', () => {
      expect(getColumnHeaders(mockHeader, mockBrowserFields)[0].actions).toEqual(actions);
    });

    test('it renders custom actions when `actions` is defined in the header', () => {
      const customActions = {
        showSortAsc: {
          label: 'A custom sort ascending',
        },
        showSortDesc: {
          label: 'A custom sort descending',
        },
      };

      const headerWithCustomActions = mockHeader.map((x) =>
        x.id === '@timestamp'
          ? {
              ...x,
              actions: customActions,
            }
          : x
      );

      expect(getColumnHeaders(headerWithCustomActions, mockBrowserFields)[0].actions).toEqual(
        customActions
      );
    });

    describe('isSortable', () => {
      test("it is sortable, because `@timestamp`'s `aggregatable` BrowserFields property is `true`", () => {
        expect(getColumnHeaders(mockHeader, mockBrowserFields)[0].isSortable).toEqual(true);
      });

      test("it is NOT sortable, when `@timestamp`'s `aggregatable` BrowserFields property is `false`", () => {
        const withAggregatableOverride = set(
          'base.fields.@timestamp.aggregatable',
          false, // override `aggregatable` for `@timestamp`, a date field that is normally aggregatable
          mockBrowserFields
        );

        expect(getColumnHeaders(mockHeader, withAggregatableOverride)[0].isSortable).toEqual(false);
      });

      test('it is NOT sortable when BrowserFields does not have metadata for the field', () => {
        const noBrowserFieldEntry = omit('base', mockBrowserFields); // omit the 'base` category, which contains `@timestamp`

        expect(getColumnHeaders(mockHeader, noBrowserFieldEntry)[0].isSortable).toEqual(false);
      });
    });

    test('should return a full object of ColumnHeader from the default header', () => {
      const expectedData = [
        {
          actions,
          aggregatable: true,
          category: 'base',
          columnHeaderType: 'not-filtered',
          defaultSortDirection,
          description:
            'Date/time when the event originated. For log events this is the date/time when the event was generated, and not when it was read. Required field for all events.',
          example: '2016-05-23T08:05:34.853Z',
          format: '',
          id: '@timestamp',
          indexes: ['auditbeat', 'filebeat', 'packetbeat'],
          isSortable,
          name: '@timestamp',
          schema: 'datetime',
          searchable: true,
          type: 'date',
          initialWidth: 190,
        },
        {
          actions,
          aggregatable: true,
          category: 'source',
          columnHeaderType: 'not-filtered',
          defaultSortDirection,
          description: 'IP address of the source. Can be one or multiple IPv4 or IPv6 addresses.',
          example: '',
          format: '',
          id: 'source.ip',
          indexes: ['auditbeat', 'filebeat', 'packetbeat'],
          isSortable,
          name: 'source.ip',
          searchable: true,
          type: 'ip',
          initialWidth: 180,
        },
        {
          actions,
          aggregatable: true,
          category: 'destination',
          columnHeaderType: 'not-filtered',
          defaultSortDirection,
          description:
            'IP address of the destination. Can be one or multiple IPv4 or IPv6 addresses.',
          example: '',
          format: '',
          id: 'destination.ip',
          indexes: ['auditbeat', 'filebeat', 'packetbeat'],
          isSortable,
          name: 'destination.ip',
          searchable: true,
          type: 'ip',
          initialWidth: 180,
        },
      ];

      // NOTE: the omitted `display` (`React.ReactNode`) property is tested separately above
      expect(getColumnHeaders(mockHeader, mockBrowserFields).map(omit('display'))).toEqual(
        expectedData
      );
    });

    test('it should NOT override a custom `schema` when the `header` provides it', () => {
      const expected = [
        {
          actions,
          aggregatable: true,
          category: 'base',
          columnHeaderType: 'not-filtered',
          defaultSortDirection,
          description:
            'Date/time when the event originated. For log events this is the date/time when the event was generated, and not when it was read. Required field for all events.',
          example: '2016-05-23T08:05:34.853Z',
          format: '',
          id: '@timestamp',
          indexes: ['auditbeat', 'filebeat', 'packetbeat'],
          isSortable,
          name: '@timestamp',
          schema: 'custom', // <-- we expect our custom schema will NOT be overridden by a built-in schema
          searchable: true,
          type: 'date', // <-- the built-in schema for `type: 'date'` is 'datetime', but the custom schema overrides it
          initialWidth: 190,
        },
      ];

      const headerWithCustomSchema: ColumnHeaderOptions = {
        columnHeaderType: 'not-filtered',
        id: '@timestamp',
        initialWidth: 190,
        schema: 'custom', // <-- overrides the default of 'datetime'
      };

      expect(
        getColumnHeaders([headerWithCustomSchema], mockBrowserFields).map(omit('display'))
      ).toEqual(expected);
    });

    test('it should return an `undefined` `schema` when a `header` does NOT have an entry in `BrowserFields`', () => {
      const expected = [
        {
          actions,
          columnHeaderType: 'not-filtered',
          defaultSortDirection,
          id: 'no_matching_browser_field',
          isSortable: false,
          schema: undefined, // <-- no `BrowserFields` entry for this field
        },
      ];

      const headerDoesNotMatchBrowserField: ColumnHeaderOptions = {
        columnHeaderType: 'not-filtered',
        id: 'no_matching_browser_field',
      };

      expect(
        getColumnHeaders([headerDoesNotMatchBrowserField], mockBrowserFields).map(omit('display'))
      ).toEqual(expected);
    });

    describe('augment the `header` with metadata from `browserFields`', () => {
      test('it should augment the `header` when field category is base', () => {
        const fieldName = 'test_field';
        const testField = {
          aggregatable: true,
          category: 'base',
          description:
            'Date/time when the event originated. For log events this is the date/time when the event was generated, and not when it was read. Required field for all events.',
          example: '2016-05-23T08:05:34.853Z',
          format: 'date',
          indexes: ['auditbeat', 'filebeat', 'packetbeat'],
          name: fieldName,
          searchable: true,
          type: 'date',
        };

        const browserField = { base: { fields: { [fieldName]: testField } } };

        const header: ColumnHeaderOptions = {
          columnHeaderType: 'not-filtered',
          id: fieldName,
        };

        expect(
          getColumnHeaders([header], browserField).map(
            omit(['display', 'actions', 'isSortable', 'defaultSortDirection', 'schema'])
          )
        ).toEqual([
          {
            ...header,
            ...browserField.base.fields[fieldName],
          },
        ]);
      });

      test("it should augment the `header` when field is top level and name isn't splittable", () => {
        const fieldName = 'testFieldName';
        const testField = {
          aggregatable: true,
          category: fieldName,
          description: 'test field description',
          example: '2016-05-23T08:05:34.853Z',
          format: 'date',
          indexes: ['auditbeat', 'filebeat', 'packetbeat'],
          name: fieldName,
          searchable: true,
          type: 'date',
        };

        const browserField = { [fieldName]: { fields: { [fieldName]: testField } } };

        const header: ColumnHeaderOptions = {
          columnHeaderType: 'not-filtered',
          id: fieldName,
        };

        expect(
          getColumnHeaders([header], browserField).map(
            omit(['display', 'actions', 'isSortable', 'defaultSortDirection', 'schema'])
          )
        ).toEqual([
          {
            ...header,
            ...browserField[fieldName].fields[fieldName],
          },
        ]);
      });

      test('it should augment the `header` when field is splittable', () => {
        const fieldName = 'test.field.splittable';
        const testField = {
          aggregatable: true,
          category: 'test',
          description: 'test field description',
          example: '2016-05-23T08:05:34.853Z',
          format: 'date',
          indexes: ['auditbeat', 'filebeat', 'packetbeat'],
          name: fieldName,
          searchable: true,
          type: 'date',
        };

        const browserField = { test: { fields: { [fieldName]: testField } } };

        const header: ColumnHeaderOptions = {
          columnHeaderType: 'not-filtered',
          id: fieldName,
        };

        expect(
          getColumnHeaders([header], browserField).map(
            omit(['display', 'actions', 'isSortable', 'defaultSortDirection', 'schema'])
          )
        ).toEqual([
          {
            ...header,
            ...browserField.test.fields[fieldName],
          },
        ]);
      });
    });
  });

  describe('getActionsColumnWidth', () => {
    // ideally the following implementation detail wouldn't be part of these tests,
    // but without it, the test would be brittle when `euiDataGridCellPaddingM` changes:
    const expectedPadding = parseInt(euiThemeVars.euiDataGridCellPaddingM, 10) * 2;

    test('it returns the expected width', () => {
      const ACTION_BUTTON_COUNT = 5;
      const expectedContentWidth = ACTION_BUTTON_COUNT * DEFAULT_ACTION_BUTTON_WIDTH;

      expect(getActionsColumnWidth(ACTION_BUTTON_COUNT)).toEqual(
        expectedContentWidth + expectedPadding
      );
    });

    test('it returns the minimum width when the button count is zero', () => {
      const ACTION_BUTTON_COUNT = 0;

      expect(getActionsColumnWidth(ACTION_BUTTON_COUNT)).toEqual(
        DEFAULT_ACTION_BUTTON_WIDTH + expectedPadding
      );
    });

    test('it returns the minimum width when the button count is negative', () => {
      const ACTION_BUTTON_COUNT = -1;

      expect(getActionsColumnWidth(ACTION_BUTTON_COUNT)).toEqual(
        DEFAULT_ACTION_BUTTON_WIDTH + expectedPadding
      );
    });
  });
});
