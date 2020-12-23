/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { mount } from 'enzyme';
import { act } from 'react-dom/test-utils';
import {
  EuiFieldNumber,
  EuiRange,
  EuiButtonEmpty,
  EuiLink,
  EuiText,
  EuiFieldText,
} from '@elastic/eui';
import { IUiSettingsClient, SavedObjectsClientContract, HttpSetup } from 'kibana/public';
import { IStorageWrapper } from 'src/plugins/kibana_utils/public';
import type { IndexPatternLayer, IndexPattern } from '../../../types';
import { dataPluginMock } from '../../../../../../../../src/plugins/data/public/mocks';
import { rangeOperation } from '../index';
import { RangeIndexPatternColumn } from './ranges';
import {
  MODES,
  DEFAULT_INTERVAL,
  TYPING_DEBOUNCE_TIME,
  MIN_HISTOGRAM_BARS,
  SLICES,
} from './constants';
import { RangePopover } from './advanced_editor';
import { DragDropBuckets } from '../shared_components';
import { getFieldByNameFactory } from '../../../pure_helpers';

const dataPluginMockValue = dataPluginMock.createStartContract();
// need to overwrite the formatter field first
dataPluginMockValue.fieldFormats.deserialize = jest.fn().mockImplementation(({ params }) => {
  return {
    convert: ({ gte, lt }: { gte: string; lt: string }) => {
      if (params?.id === 'custom') {
        return `Custom format: ${gte} - ${lt}`;
      }
      if (params?.id === 'bytes') {
        return `Bytes format: ${gte} - ${lt}`;
      }
      return `${gte} - ${lt}`;
    },
  };
});

type ReactMouseEvent = React.MouseEvent<HTMLAnchorElement, MouseEvent> &
  React.MouseEvent<HTMLButtonElement, MouseEvent>;

const sourceField = 'MyField';
const defaultOptions = {
  storage: {} as IStorageWrapper,
  // need this for MAX_HISTOGRAM value
  uiSettings: ({
    get: () => 100,
  } as unknown) as IUiSettingsClient,
  savedObjectsClient: {} as SavedObjectsClientContract,
  dateRange: {
    fromDate: 'now-1y',
    toDate: 'now',
  },
  data: dataPluginMockValue,
  http: {} as HttpSetup,
  indexPattern: {
    id: '1',
    title: 'my_index_pattern',
    hasRestrictions: false,
    fields: [{ name: sourceField, type: 'number', displayName: sourceField }],
    getFieldByName: getFieldByNameFactory([
      { name: sourceField, type: 'number', displayName: sourceField },
    ]),
  },
};

describe('ranges', () => {
  let layer: IndexPatternLayer;
  const InlineOptions = rangeOperation.paramEditor!;
  const MAX_HISTOGRAM_VALUE = 100;
  const GRANULARITY_DEFAULT_VALUE = (MAX_HISTOGRAM_VALUE - MIN_HISTOGRAM_BARS) / 2;
  const GRANULARITY_STEP = (MAX_HISTOGRAM_VALUE - MIN_HISTOGRAM_BARS) / SLICES;

  function setToHistogramMode() {
    const column = layer.columns.col1 as RangeIndexPatternColumn;
    column.dataType = 'number';
    column.scale = 'interval';
    column.params.type = MODES.Histogram;
  }

  function setToRangeMode() {
    const column = layer.columns.col1 as RangeIndexPatternColumn;
    column.dataType = 'string';
    column.scale = 'ordinal';
    column.params.type = MODES.Range;
  }

  function getDefaultLayer(): IndexPatternLayer {
    return {
      indexPatternId: '1',
      columnOrder: ['col1', 'col2'],
      columns: {
        // Start with the histogram type
        col1: {
          label: sourceField,
          dataType: 'number',
          operationType: 'range',
          scale: 'interval',
          isBucketed: true,
          sourceField,
          params: {
            type: MODES.Histogram,
            ranges: [{ from: 0, to: DEFAULT_INTERVAL, label: '' }],
            maxBars: 'auto',
          },
        },
        col2: {
          label: 'Count',
          dataType: 'number',
          isBucketed: false,
          sourceField: 'Records',
          operationType: 'count',
        },
      },
    };
  }

  beforeAll(() => {
    jest.useFakeTimers();
  });

  beforeEach(() => {
    layer = getDefaultLayer();
  });

  describe('toEsAggsFn', () => {
    afterAll(() => setToHistogramMode());

    it('should reflect params correctly', () => {
      const esAggsFn = rangeOperation.toEsAggsFn(
        layer.columns.col1 as RangeIndexPatternColumn,
        'col1',
        {} as IndexPattern
      );
      expect(esAggsFn).toMatchInlineSnapshot(`
        Object {
          "arguments": Object {
            "enabled": Array [
              true,
            ],
            "extended_bounds": Array [
              "{\\"min\\":\\"\\",\\"max\\":\\"\\"}",
            ],
            "field": Array [
              "MyField",
            ],
            "has_extended_bounds": Array [
              false,
            ],
            "id": Array [
              "col1",
            ],
            "interval": Array [
              "auto",
            ],
            "min_doc_count": Array [
              false,
            ],
            "schema": Array [
              "segment",
            ],
          },
          "function": "aggHistogram",
          "type": "function",
        }
      `);
    });

    it('should set maxBars param if provided', () => {
      (layer.columns.col1 as RangeIndexPatternColumn).params.maxBars = 10;

      const esAggsFn = rangeOperation.toEsAggsFn(
        layer.columns.col1 as RangeIndexPatternColumn,
        'col1',
        {} as IndexPattern
      );

      expect(esAggsFn).toEqual(
        expect.objectContaining({
          function: 'aggHistogram',
          arguments: expect.objectContaining({
            maxBars: [10],
          }),
        })
      );
    });

    it('should reflect the type correctly', () => {
      setToRangeMode();

      const esAggsFn = rangeOperation.toEsAggsFn(
        layer.columns.col1 as RangeIndexPatternColumn,
        'col1',
        {} as IndexPattern
      );

      expect(esAggsFn).toEqual(
        expect.objectContaining({
          function: 'aggRange',
        })
      );
    });

    it('should include custom labels', () => {
      setToRangeMode();
      (layer.columns.col1 as RangeIndexPatternColumn).params.ranges = [
        { from: 0, to: 100, label: 'customlabel' },
      ];

      const esAggsFn = rangeOperation.toEsAggsFn(
        layer.columns.col1 as RangeIndexPatternColumn,
        'col1',
        {} as IndexPattern
      );

      expect((esAggsFn as { arguments: unknown }).arguments).toEqual(
        expect.objectContaining({
          ranges: [JSON.stringify([{ from: 0, to: 100, label: 'customlabel' }])],
        })
      );
    });
  });

  describe('getPossibleOperationForField', () => {
    it('should return operation with the right type for number', () => {
      expect(
        rangeOperation.getPossibleOperationForField({
          aggregatable: true,
          searchable: true,
          name: 'test',
          displayName: 'test',
          type: 'number',
        })
      ).toEqual({
        dataType: 'number',
        isBucketed: true,
        scale: 'interval',
      });
    });

    it('should not return operation if field type is not number', () => {
      expect(
        rangeOperation.getPossibleOperationForField({
          aggregatable: false,
          searchable: true,
          name: 'test',
          displayName: 'test',
          type: 'string',
        })
      ).toEqual(undefined);
    });
  });

  describe('paramEditor', () => {
    describe('Modify intervals in basic mode', () => {
      beforeEach(() => {
        layer = getDefaultLayer();
      });

      it('should start update the state with the default maxBars value', () => {
        const updateLayerSpy = jest.fn();
        mount(
          <InlineOptions
            {...defaultOptions}
            layer={layer}
            updateLayer={updateLayerSpy}
            columnId="col1"
            currentColumn={layer.columns.col1 as RangeIndexPatternColumn}
          />
        );

        expect(updateLayerSpy).toHaveBeenCalledWith({
          ...layer,
          columns: {
            ...layer.columns,
            col1: {
              ...layer.columns.col1,
              params: {
                ...layer.columns.col1.params,
                maxBars: GRANULARITY_DEFAULT_VALUE,
              },
            },
          },
        });
      });

      it('should update state when changing Max bars number', () => {
        const updateLayerSpy = jest.fn();

        const instance = mount(
          <InlineOptions
            {...defaultOptions}
            layer={layer}
            updateLayer={updateLayerSpy}
            columnId="col1"
            currentColumn={layer.columns.col1 as RangeIndexPatternColumn}
          />
        );

        // There's a useEffect in the component that updates the value on bootstrap
        // because there's a debouncer, wait a bit before calling onChange
        act(() => {
          jest.advanceTimersByTime(TYPING_DEBOUNCE_TIME * 4);

          instance.find(EuiRange).prop('onChange')!(
            {
              currentTarget: {
                value: '' + MAX_HISTOGRAM_VALUE,
              },
            } as React.ChangeEvent<HTMLInputElement>,
            true
          );

          jest.advanceTimersByTime(TYPING_DEBOUNCE_TIME * 4);
        });

        expect(updateLayerSpy).toHaveBeenCalledWith({
          ...layer,
          columns: {
            ...layer.columns,
            col1: {
              ...layer.columns.col1,
              params: {
                ...layer.columns.col1.params,
                maxBars: MAX_HISTOGRAM_VALUE,
              },
            },
          },
        });
      });

      it('should update the state using the plus or minus buttons by the step amount', () => {
        const updateLayerSpy = jest.fn();

        const instance = mount(
          <InlineOptions
            {...defaultOptions}
            layer={layer}
            updateLayer={updateLayerSpy}
            columnId="col1"
            currentColumn={layer.columns.col1 as RangeIndexPatternColumn}
          />
        );

        // There's a useEffect in the component that updates the value on bootstrap
        // because there's a debouncer, wait a bit before calling onChange
        act(() => {
          jest.advanceTimersByTime(TYPING_DEBOUNCE_TIME * 4);
          // minus button
          instance
            .find('[data-test-subj="lns-indexPattern-range-maxBars-minus"]')
            .find('button')
            .prop('onClick')!({} as ReactMouseEvent);
          jest.advanceTimersByTime(TYPING_DEBOUNCE_TIME * 4);
        });

        expect(updateLayerSpy).toHaveBeenCalledWith({
          ...layer,
          columns: {
            ...layer.columns,
            col1: {
              ...layer.columns.col1,
              params: {
                ...layer.columns.col1.params,
                maxBars: GRANULARITY_DEFAULT_VALUE - GRANULARITY_STEP,
              },
            },
          },
        });

        act(() => {
          // plus button
          instance
            .find('[data-test-subj="lns-indexPattern-range-maxBars-plus"]')
            .find('button')
            .prop('onClick')!({} as ReactMouseEvent);
          jest.advanceTimersByTime(TYPING_DEBOUNCE_TIME * 4);
        });

        expect(updateLayerSpy).toHaveBeenCalledWith({
          ...layer,
          columns: {
            ...layer.columns,
            col1: {
              ...layer.columns.col1,
              params: {
                ...layer.columns.col1.params,
                maxBars: GRANULARITY_DEFAULT_VALUE,
              },
            },
          },
        });
      });
    });

    describe('Specify range intervals manually', () => {
      // @ts-expect-error
      window['__react-beautiful-dnd-disable-dev-warnings'] = true; // issue with enzyme & react-beautiful-dnd throwing errors: https://github.com/atlassian/react-beautiful-dnd/issues/1593

      beforeEach(() => setToRangeMode());

      it('should show one range interval to start with', () => {
        const updateLayerSpy = jest.fn();

        const instance = mount(
          <InlineOptions
            {...defaultOptions}
            layer={layer}
            updateLayer={updateLayerSpy}
            columnId="col1"
            currentColumn={layer.columns.col1 as RangeIndexPatternColumn}
          />
        );

        expect(instance.find(DragDropBuckets).children).toHaveLength(1);
      });

      it('should add a new range', () => {
        const updateLayerSpy = jest.fn();

        const instance = mount(
          <InlineOptions
            {...defaultOptions}
            layer={layer}
            updateLayer={updateLayerSpy}
            columnId="col1"
            currentColumn={layer.columns.col1 as RangeIndexPatternColumn}
          />
        );

        // This series of act closures are made to make it work properly the update flush
        act(() => {
          instance.find(EuiButtonEmpty).prop('onClick')!({} as ReactMouseEvent);
        });

        act(() => {
          // need another wrapping for this in order to work
          instance.update();

          expect(instance.find(RangePopover)).toHaveLength(2);

          // edit the range and check
          instance.find(RangePopover).find(EuiFieldNumber).first().prop('onChange')!({
            target: {
              value: '50',
            },
          } as React.ChangeEvent<HTMLInputElement>);
          jest.advanceTimersByTime(TYPING_DEBOUNCE_TIME * 4);

          expect(updateLayerSpy).toHaveBeenCalledWith({
            ...layer,
            columns: {
              ...layer.columns,
              col1: {
                ...layer.columns.col1,
                params: {
                  ...layer.columns.col1.params,
                  ranges: [
                    { from: 0, to: DEFAULT_INTERVAL, label: '' },
                    { from: 50, to: Infinity, label: '' },
                  ],
                },
              },
            },
          });
        });
      });

      it('should add a new range with custom label', () => {
        const updateLayerSpy = jest.fn();

        const instance = mount(
          <InlineOptions
            {...defaultOptions}
            layer={layer}
            updateLayer={updateLayerSpy}
            columnId="col1"
            currentColumn={layer.columns.col1 as RangeIndexPatternColumn}
          />
        );

        // This series of act closures are made to make it work properly the update flush
        act(() => {
          instance.find(EuiButtonEmpty).prop('onClick')!({} as ReactMouseEvent);
        });

        act(() => {
          // need another wrapping for this in order to work
          instance.update();

          expect(instance.find(RangePopover)).toHaveLength(2);

          // edit the label and check
          instance.find(RangePopover).find(EuiFieldText).first().prop('onChange')!({
            target: {
              value: 'customlabel',
            },
          } as React.ChangeEvent<HTMLInputElement>);
          jest.advanceTimersByTime(TYPING_DEBOUNCE_TIME * 4);

          expect(updateLayerSpy).toHaveBeenCalledWith({
            ...layer,
            columns: {
              ...layer.columns,
              col1: {
                ...layer.columns.col1,
                params: {
                  ...layer.columns.col1.params,
                  ranges: [
                    { from: 0, to: DEFAULT_INTERVAL, label: '' },
                    { from: DEFAULT_INTERVAL, to: Infinity, label: 'customlabel' },
                  ],
                },
              },
            },
          });
        });
      });

      it('should open a popover to edit an existing range', () => {
        const updateLayerSpy = jest.fn();

        const instance = mount(
          <InlineOptions
            {...defaultOptions}
            layer={layer}
            updateLayer={updateLayerSpy}
            columnId="col1"
            currentColumn={layer.columns.col1 as RangeIndexPatternColumn}
          />
        );

        // This series of act closures are made to make it work properly the update flush
        act(() => {
          instance.find(RangePopover).find(EuiLink).prop('onClick')!({} as ReactMouseEvent);
        });

        act(() => {
          // need another wrapping for this in order to work
          instance.update();

          // edit the range "to" field
          instance.find(RangePopover).find(EuiFieldNumber).last().prop('onChange')!({
            target: {
              value: '50',
            },
          } as React.ChangeEvent<HTMLInputElement>);
          jest.advanceTimersByTime(TYPING_DEBOUNCE_TIME * 4);

          expect(updateLayerSpy).toHaveBeenCalledWith({
            ...layer,
            columns: {
              ...layer.columns,
              col1: {
                ...layer.columns.col1,
                params: {
                  ...layer.columns.col1.params,
                  ranges: [{ from: 0, to: 50, label: '' }],
                },
              },
            },
          });
        });
      });

      it('should not accept invalid ranges', () => {
        const updateLayerSpy = jest.fn();

        const instance = mount(
          <InlineOptions
            {...defaultOptions}
            layer={layer}
            updateLayer={updateLayerSpy}
            columnId="col1"
            currentColumn={layer.columns.col1 as RangeIndexPatternColumn}
          />
        );

        // This series of act closures are made to make it work properly the update flush
        act(() => {
          instance.find(RangePopover).find(EuiLink).prop('onClick')!({} as ReactMouseEvent);
        });

        act(() => {
          // need another wrapping for this in order to work
          instance.update();

          // edit the range "to" field
          instance.find(RangePopover).find(EuiFieldNumber).last().prop('onChange')!({
            target: {
              value: '-1',
            },
          } as React.ChangeEvent<HTMLInputElement>);
        });

        act(() => {
          instance.update();

          // and check
          expect(instance.find(RangePopover).find(EuiFieldNumber).last().prop('isInvalid')).toBe(
            true
          );
        });
      });

      it('should be possible to remove a range if multiple', () => {
        const updateLayerSpy = jest.fn();

        // Add an extra range
        (layer.columns.col1 as RangeIndexPatternColumn).params.ranges.push({
          from: DEFAULT_INTERVAL,
          to: 2 * DEFAULT_INTERVAL,
          label: '',
        });

        const instance = mount(
          <InlineOptions
            {...defaultOptions}
            layer={layer}
            updateLayer={updateLayerSpy}
            columnId="col1"
            currentColumn={layer.columns.col1 as RangeIndexPatternColumn}
          />
        );

        expect(instance.find(RangePopover)).toHaveLength(2);

        // This series of act closures are made to make it work properly the update flush
        act(() => {
          instance
            .find('[data-test-subj="lns-customBucketContainer-remove"]')
            .last()
            .prop('onClick')!({} as ReactMouseEvent);
        });

        act(() => {
          // need another wrapping for this in order to work
          instance.update();

          expect(instance.find(RangePopover)).toHaveLength(1);
        });
      });

      it('should handle correctly open ranges when saved', () => {
        const updateLayerSpy = jest.fn();

        // Add an extra open range:
        (layer.columns.col1 as RangeIndexPatternColumn).params.ranges.push({
          from: null,
          to: null,
          label: '',
        });

        const instance = mount(
          <InlineOptions
            {...defaultOptions}
            layer={layer}
            updateLayer={updateLayerSpy}
            columnId="col1"
            currentColumn={layer.columns.col1 as RangeIndexPatternColumn}
          />
        );

        act(() => {
          instance.find(RangePopover).last().find(EuiLink).prop('onClick')!({} as ReactMouseEvent);
        });

        act(() => {
          // need another wrapping for this in order to work
          instance.update();

          // Check UI values for open ranges
          expect(
            instance.find(RangePopover).last().find(EuiFieldNumber).first().prop('value')
          ).toBe('');

          expect(instance.find(RangePopover).last().find(EuiFieldNumber).last().prop('value')).toBe(
            ''
          );
        });
      });

      it('should correctly handle the default formatter for the field', () => {
        const updateLayerSpy = jest.fn();

        const instance = mount(
          <InlineOptions
            {...defaultOptions}
            layer={layer}
            updateLayer={updateLayerSpy}
            columnId="col1"
            currentColumn={layer.columns.col1 as RangeIndexPatternColumn}
            indexPattern={{
              ...defaultOptions.indexPattern,
              fieldFormatMap: {
                MyField: { id: 'custom', params: {} },
              },
            }}
          />
        );

        expect(instance.find(RangePopover).find(EuiText).prop('children')).toMatch(
          /^Custom format:/
        );
      });

      it('should correctly pick the dimension formatter for the field', () => {
        const updateLayerSpy = jest.fn();

        // now set a format on the range operation
        (layer.columns.col1 as RangeIndexPatternColumn).params.format = {
          id: 'bytes',
          params: { decimals: 0 },
        };

        const instance = mount(
          <InlineOptions
            {...defaultOptions}
            layer={layer}
            updateLayer={updateLayerSpy}
            columnId="col1"
            currentColumn={layer.columns.col1 as RangeIndexPatternColumn}
            indexPattern={{
              ...defaultOptions.indexPattern,
              fieldFormatMap: {
                MyField: { id: 'custom', params: {} },
              },
            }}
          />
        );

        expect(instance.find(RangePopover).find(EuiText).prop('children')).toMatch(
          /^Bytes format:/
        );
      });

      it('should not update the state on mount', () => {
        const updateLayerSpy = jest.fn();

        mount(
          <InlineOptions
            {...defaultOptions}
            layer={layer}
            updateLayer={updateLayerSpy}
            columnId="col1"
            currentColumn={layer.columns.col1 as RangeIndexPatternColumn}
          />
        );
        expect(updateLayerSpy.mock.calls.length).toBe(0);
      });

      it('should not reset formatters when switching between custom ranges and auto histogram', () => {
        const updateLayerSpy = jest.fn();
        // now set a format on the range operation
        (layer.columns.col1 as RangeIndexPatternColumn).params.format = {
          id: 'custom',
          params: { decimals: 3 },
        };

        const instance = mount(
          <InlineOptions
            {...defaultOptions}
            layer={layer}
            updateLayer={updateLayerSpy}
            columnId="col1"
            currentColumn={layer.columns.col1 as RangeIndexPatternColumn}
          />
        );

        // This series of act closures are made to make it work properly the update flush
        act(() => {
          instance.find(EuiLink).first().prop('onClick')!({} as ReactMouseEvent);
        });

        expect(updateLayerSpy.mock.calls[1][0].columns.col1.params.format).toEqual({
          id: 'custom',
          params: { decimals: 3 },
        });
      });
    });
  });
});
