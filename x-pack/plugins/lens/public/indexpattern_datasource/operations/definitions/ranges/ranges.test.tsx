/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mount } from 'enzyme';
import { act } from 'react-dom/test-utils';
import { EuiFieldNumber, EuiRange, EuiButtonEmpty, EuiLink, EuiText } from '@elastic/eui';
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

// mocking random id generator function
jest.mock('@elastic/eui', () => {
  const original = jest.requireActual('@elastic/eui');

  return {
    ...original,
    htmlIdGenerator: (fn: unknown) => {
      let counter = 0;
      return () => counter++;
    },
  };
});

jest.mock('react-use/lib/useDebounce', () => (fn: () => void) => fn());

jest.mock('lodash', () => {
  const original = jest.requireActual('lodash');

  return {
    ...original,
    debounce: (fn: unknown) => fn,
  };
});

const dataPluginMockValue = dataPluginMock.createStartContract();
// need to overwrite the formatter field first
dataPluginMockValue.fieldFormats.deserialize = jest.fn().mockImplementation(({ id, params }) => {
  return {
    convert: ({ gte, lt }: { gte: string; lt: string }) => {
      if (params?.id === 'custom') {
        return `Custom format: ${gte} - ${lt}`;
      }
      if (params?.id === 'bytes') {
        return `Bytes format: ${gte} - ${lt}`;
      }
      if (!id) {
        return 'Error';
      }
      return `${gte} - ${lt}`;
    },
  };
});

// need this for MAX_HISTOGRAM value
const uiSettingsMock = {
  get: jest.fn().mockReturnValue(100),
} as unknown as IUiSettingsClient;

const sourceField = 'MyField';
const defaultOptions = {
  storage: {} as IStorageWrapper,
  uiSettings: uiSettingsMock,
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
    fields: [
      {
        name: sourceField,
        type: 'number',
        displayName: sourceField,
        searchable: true,
        aggregatable: true,
      },
    ],
    getFieldByName: getFieldByNameFactory([
      {
        name: sourceField,
        type: 'number',
        displayName: sourceField,
        searchable: true,
        aggregatable: true,
      },
    ]),
  },
  operationDefinitionMap: {},
  isFullscreen: false,
  toggleFullscreen: jest.fn(),
  setIsCloseable: jest.fn(),
  layerId: '1',
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
        } as RangeIndexPatternColumn,
        col2: {
          label: 'Count',
          dataType: 'number',
          isBucketed: false,
          sourceField: '___records___',
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
        {} as IndexPattern,
        layer,
        uiSettingsMock,
        []
      );
      expect(esAggsFn).toMatchInlineSnapshot(`
        Object {
          "arguments": Object {
            "autoExtendBounds": Array [
              false,
            ],
            "enabled": Array [
              true,
            ],
            "extended_bounds": Array [
              Object {
                "chain": Array [
                  Object {
                    "arguments": Object {},
                    "function": "extendedBounds",
                    "type": "function",
                  },
                ],
                "type": "expression",
              },
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
            "maxBars": Array [
              49.5,
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
        {} as IndexPattern,
        layer,
        uiSettingsMock,
        []
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

    it('should reflect show empty rows correctly', () => {
      (layer.columns.col1 as RangeIndexPatternColumn).params.maxBars = 10;
      (layer.columns.col1 as RangeIndexPatternColumn).params.includeEmptyRows = true;

      const esAggsFn = rangeOperation.toEsAggsFn(
        layer.columns.col1 as RangeIndexPatternColumn,
        'col1',
        {} as IndexPattern,
        layer,
        uiSettingsMock,
        []
      );

      expect(esAggsFn).toEqual(
        expect.objectContaining({
          function: 'aggHistogram',
          arguments: expect.objectContaining({
            autoExtendBounds: [true],
            min_doc_count: [true],
          }),
        })
      );
    });

    it('should reflect the type correctly', () => {
      setToRangeMode();

      const esAggsFn = rangeOperation.toEsAggsFn(
        layer.columns.col1 as RangeIndexPatternColumn,
        'col1',
        {} as IndexPattern,
        layer,
        uiSettingsMock,
        []
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
        {} as IndexPattern,
        layer,
        uiSettingsMock,
        []
      );

      expect(esAggsFn).toHaveProperty(
        'arguments.ranges.0.chain.0.arguments',
        expect.objectContaining({
          from: [0],
          to: [100],
          label: ['customlabel'],
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
        const instance = mount(
          <InlineOptions
            {...defaultOptions}
            layer={layer}
            updateLayer={updateLayerSpy}
            columnId="col1"
            currentColumn={layer.columns.col1 as RangeIndexPatternColumn}
          />
        );

        expect(instance.find(EuiRange).prop('value')).toEqual(String(GRANULARITY_DEFAULT_VALUE));
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
                ...(layer.columns.col1 as RangeIndexPatternColumn).params,
                maxBars: MAX_HISTOGRAM_VALUE,
              },
            } as RangeIndexPatternColumn,
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

        act(() => {
          jest.advanceTimersByTime(TYPING_DEBOUNCE_TIME * 4);
          // minus button
          instance
            .find('[data-test-subj="lns-indexPattern-range-maxBars-minus"]')
            .find('button')
            .simulate('click');
          jest.advanceTimersByTime(TYPING_DEBOUNCE_TIME * 4);
          instance.update();
        });

        expect(updateLayerSpy).toHaveBeenCalledWith({
          ...layer,
          columns: {
            ...layer.columns,
            col1: {
              ...layer.columns.col1,
              params: {
                ...(layer.columns.col1 as RangeIndexPatternColumn).params,
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
            .simulate('click');
          jest.advanceTimersByTime(TYPING_DEBOUNCE_TIME * 4);
          instance.update();
        });

        expect(updateLayerSpy).toHaveBeenCalledWith({
          ...layer,
          columns: {
            ...layer.columns,
            col1: {
              ...layer.columns.col1,
              params: {
                ...(layer.columns.col1 as RangeIndexPatternColumn).params,
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

      it('should use the parentFormat to create the trigger label', () => {
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

        expect(
          instance.find('[data-test-subj="indexPattern-ranges-popover-trigger"]').first().text()
        ).toBe('0 - 1000');
      });

      it('should not print error if the parentFormat is not provided', () => {
        // while in the actual React implementation will print an error, here
        // we intercept the formatter without an id assigned an print "Error"
        const updateLayerSpy = jest.fn();

        const instance = mount(
          <InlineOptions
            {...defaultOptions}
            layer={layer}
            updateLayer={updateLayerSpy}
            columnId="col1"
            currentColumn={
              {
                ...layer.columns.col1,
                params: {
                  ...(layer.columns.col1 as RangeIndexPatternColumn).params,
                  parentFormat: undefined,
                },
              } as RangeIndexPatternColumn
            }
          />
        );

        expect(
          instance.find('[data-test-subj="indexPattern-ranges-popover-trigger"]').first().text()
        ).not.toBe('Error');
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
          instance.find(EuiButtonEmpty).simulate('click');
        });

        act(() => {
          // need another wrapping for this in order to work
          instance.update();

          expect(instance.find(RangePopover)).toHaveLength(2);

          // edit the range and check
          instance
            .find('RangePopover input[type="number"]')
            .first()
            .simulate('change', {
              target: {
                value: '50',
              },
            });

          jest.advanceTimersByTime(TYPING_DEBOUNCE_TIME * 4);

          expect(updateLayerSpy).toHaveBeenCalledWith({
            ...layer,
            columns: {
              ...layer.columns,
              col1: {
                ...layer.columns.col1,
                params: {
                  ...(layer.columns.col1 as RangeIndexPatternColumn).params,
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
          instance.find(EuiButtonEmpty).simulate('click');
        });

        act(() => {
          // need another wrapping for this in order to work
          instance.update();

          expect(instance.find(RangePopover)).toHaveLength(2);

          // edit the label and check
          instance
            .find('RangePopover input[type="text"]')
            .first()
            .simulate('change', {
              target: {
                value: 'customlabel',
              },
            });

          jest.advanceTimersByTime(TYPING_DEBOUNCE_TIME * 4);

          expect(updateLayerSpy).toHaveBeenCalledWith({
            ...layer,
            columns: {
              ...layer.columns,
              col1: {
                ...layer.columns.col1,
                params: {
                  ...(layer.columns.col1 as RangeIndexPatternColumn).params,
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
          instance.find(RangePopover).find(EuiLink).simulate('click');
        });

        act(() => {
          // need another wrapping for this in order to work
          instance.update();
          instance
            .find('RangePopover input[type="number"]')
            .last()
            .simulate('change', {
              target: {
                value: '50',
              },
            });
          jest.advanceTimersByTime(TYPING_DEBOUNCE_TIME * 4);

          expect(updateLayerSpy).toHaveBeenCalledWith({
            ...layer,
            columns: {
              ...layer.columns,
              col1: {
                ...layer.columns.col1,
                params: {
                  ...(layer.columns.col1 as RangeIndexPatternColumn).params,
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
          instance.find(RangePopover).find(EuiLink).simulate('click');
        });

        act(() => {
          // need another wrapping for this in order to work
          instance.update();

          // edit the range "to" field
          instance
            .find('RangePopover input[type="number"]')
            .last()
            .simulate('change', {
              target: {
                value: '-1',
              },
            });
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
            .simulate('click');
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
          instance.find(RangePopover).last().find(EuiLink).simulate('click');
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
          instance.find(EuiLink).first().simulate('click');
        });

        expect(updateLayerSpy.mock.calls[0][0].columns.col1.params.format).toEqual({
          id: 'custom',
          params: { decimals: 3 },
        });
      });
    });
  });
});
