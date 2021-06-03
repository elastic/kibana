/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { DateHistogramIndexPatternColumn } from './date_histogram';
import { dateHistogramOperation } from './index';
import { shallow } from 'enzyme';
import { EuiSwitch, EuiSwitchEvent } from '@elastic/eui';
import type { IUiSettingsClient, SavedObjectsClientContract, HttpSetup } from 'kibana/public';
import type { IStorageWrapper } from 'src/plugins/kibana_utils/public';
import { UI_SETTINGS } from '../../../../../../../src/plugins/data/public';
import {
  dataPluginMock,
  getCalculateAutoTimeExpression,
} from '../../../../../../../src/plugins/data/public/mocks';
import { createMockedIndexPattern } from '../../mocks';
import type { IndexPatternLayer, IndexPattern } from '../../types';
import { getFieldByNameFactory } from '../../pure_helpers';

const dataStart = dataPluginMock.createStartContract();
dataStart.search.aggs.calculateAutoTimeExpression = getCalculateAutoTimeExpression(
  (path: string) => {
    if (path === UI_SETTINGS.HISTOGRAM_MAX_BARS) {
      return 10;
    }
  }
);

const indexPattern1: IndexPattern = {
  id: '1',
  title: 'Mock Indexpattern',
  timeFieldName: 'timestamp',
  hasRestrictions: false,
  fields: [
    {
      name: 'timestamp',
      displayName: 'timestampLabel',
      type: 'date',
      esTypes: ['date'],
      aggregatable: true,
      searchable: true,
    },
  ],

  getFieldByName: getFieldByNameFactory([
    {
      name: 'timestamp',
      displayName: 'timestampLabel',
      type: 'date',
      esTypes: ['date'],
      aggregatable: true,
      searchable: true,
    },
  ]),
};

const indexPattern2: IndexPattern = {
  id: '2',
  title: 'Mock Indexpattern 2',
  hasRestrictions: false,
  fields: [
    {
      name: 'other_timestamp',
      displayName: 'other_timestamp',
      type: 'date',
      esTypes: ['date'],
      aggregatable: true,
      searchable: true,
    },
  ],
  getFieldByName: getFieldByNameFactory([
    {
      name: 'other_timestamp',
      displayName: 'other_timestamp',
      type: 'date',
      esTypes: ['date'],
      aggregatable: true,
      searchable: true,
    },
  ]),
};

const uiSettingsMock = {} as IUiSettingsClient;

const defaultOptions = {
  storage: {} as IStorageWrapper,
  uiSettings: uiSettingsMock,
  savedObjectsClient: {} as SavedObjectsClientContract,
  dateRange: {
    fromDate: 'now-1y',
    toDate: 'now',
  },
  data: dataStart,
  http: {} as HttpSetup,
  indexPattern: indexPattern1,
  operationDefinitionMap: {},
};

describe('date_histogram', () => {
  let layer: IndexPatternLayer;
  const InlineOptions = dateHistogramOperation.paramEditor!;

  beforeEach(() => {
    layer = {
      indexPatternId: '1',
      columnOrder: ['col1'],
      columns: {
        col1: {
          label: 'Value of timestamp',
          dataType: 'date',
          isBucketed: true,

          // Private
          operationType: 'date_histogram',
          params: {
            interval: '42w',
          },
          sourceField: 'timestamp',
        },
      },
    };
  });

  function layerWithInterval(interval: string) {
    return ({
      ...layer,
      columns: {
        ...layer.columns,
        col1: {
          ...layer.columns.col1,
          params: {
            interval,
          },
        },
      },
    } as unknown) as IndexPatternLayer;
  }

  describe('buildColumn', () => {
    it('should create column object with auto interval for primary time field', () => {
      const column = dateHistogramOperation.buildColumn({
        layer: { columns: {}, columnOrder: [], indexPatternId: '' },
        indexPattern: createMockedIndexPattern(),
        field: {
          name: 'timestamp',
          displayName: 'timestampLabel',
          type: 'date',
          esTypes: ['date'],
          aggregatable: true,
          searchable: true,
        },
      });
      expect(column.params.interval).toEqual('auto');
    });

    it('should create column object with auto interval for non-primary time fields', () => {
      const column = dateHistogramOperation.buildColumn({
        layer: { columns: {}, columnOrder: [], indexPatternId: '' },
        indexPattern: createMockedIndexPattern(),
        field: {
          name: 'start_date',
          displayName: 'start_date',
          type: 'date',
          esTypes: ['date'],
          aggregatable: true,
          searchable: true,
        },
      });
      expect(column.params.interval).toEqual('auto');
    });

    it('should create column object with restrictions', () => {
      const column = dateHistogramOperation.buildColumn({
        layer: { columns: {}, columnOrder: [], indexPatternId: '' },
        indexPattern: createMockedIndexPattern(),
        field: {
          name: 'timestamp',
          displayName: 'timestampLabel',
          type: 'date',
          esTypes: ['date'],
          aggregatable: true,
          searchable: true,
          aggregationRestrictions: {
            date_histogram: {
              agg: 'date_histogram',
              time_zone: 'UTC',
              calendar_interval: '1y',
            },
          },
        },
      });
      expect(column.params.interval).toEqual('1y');
      expect(column.params.timeZone).toEqual('UTC');
    });
  });

  describe('toEsAggsFn', () => {
    it('should reflect params correctly', () => {
      const esAggsFn = dateHistogramOperation.toEsAggsFn(
        layer.columns.col1 as DateHistogramIndexPatternColumn,
        'col1',
        indexPattern1,
        layer,
        uiSettingsMock,
        []
      );
      expect(esAggsFn).toEqual(
        expect.objectContaining({
          arguments: expect.objectContaining({
            interval: ['42w'],
            field: ['timestamp'],
            useNormalizedEsInterval: [true],
          }),
        })
      );
    });

    it('should not use normalized es interval for rollups', () => {
      const esAggsFn = dateHistogramOperation.toEsAggsFn(
        layer.columns.col1 as DateHistogramIndexPatternColumn,
        'col1',
        {
          ...indexPattern1,
          fields: [
            {
              name: 'timestamp',
              displayName: 'timestamp',
              aggregatable: true,
              searchable: true,
              type: 'date',
              aggregationRestrictions: {
                date_histogram: {
                  agg: 'date_histogram',
                  time_zone: 'UTC',
                  calendar_interval: '42w',
                },
              },
            },
          ],
          getFieldByName: getFieldByNameFactory([
            {
              name: 'timestamp',
              displayName: 'timestamp',
              aggregatable: true,
              searchable: true,
              type: 'date',
              aggregationRestrictions: {
                date_histogram: {
                  agg: 'date_histogram',
                  time_zone: 'UTC',
                  calendar_interval: '42w',
                },
              },
            },
          ]),
        },
        layer,
        uiSettingsMock,
        []
      );
      expect(esAggsFn).toEqual(
        expect.objectContaining({
          arguments: expect.objectContaining({
            interval: ['42w'],
            field: ['timestamp'],
            useNormalizedEsInterval: [false],
          }),
        })
      );
    });
  });

  describe('onFieldChange', () => {
    it('should change correctly without auto interval', () => {
      const oldColumn: DateHistogramIndexPatternColumn = {
        operationType: 'date_histogram',
        sourceField: 'timestamp',
        label: 'Date over timestamp',
        isBucketed: true,
        dataType: 'date',
        params: {
          interval: 'd',
        },
      };
      const indexPattern = createMockedIndexPattern();
      const newDateField = indexPattern.getFieldByName('start_date')!;

      const column = dateHistogramOperation.onFieldChange(oldColumn, newDateField);
      expect(column).toHaveProperty('sourceField', 'start_date');
      expect(column).toHaveProperty('params.interval', 'd');
      expect(column.label).toContain('start_date');
    });

    it('should not change interval from auto when switching to a non primary time field', () => {
      const oldColumn: DateHistogramIndexPatternColumn = {
        operationType: 'date_histogram',
        sourceField: 'timestamp',
        label: 'Date over timestamp',
        isBucketed: true,
        dataType: 'date',
        params: {
          interval: 'auto',
        },
      };
      const indexPattern = createMockedIndexPattern();
      const newDateField = indexPattern.getFieldByName('start_date')!;

      const column = dateHistogramOperation.onFieldChange(oldColumn, newDateField);
      expect(column).toHaveProperty('sourceField', 'start_date');
      expect(column).toHaveProperty('params.interval', 'auto');
      expect(column.label).toContain('start_date');
    });
  });

  describe('transfer', () => {
    it('should adjust interval and time zone params if that is necessary due to restrictions', () => {
      const transferedColumn = dateHistogramOperation.transfer!(
        {
          dataType: 'date',
          isBucketed: true,
          label: '',
          operationType: 'date_histogram',
          sourceField: 'dateField',
          params: {
            interval: 'd',
          },
        },
        {
          title: '',
          id: '',
          hasRestrictions: true,
          fields: [
            {
              name: 'dateField',
              displayName: 'dateField',
              type: 'date',
              aggregatable: true,
              searchable: true,
              aggregationRestrictions: {
                date_histogram: {
                  agg: 'date_histogram',
                  time_zone: 'CET',
                  calendar_interval: 'w',
                },
              },
            },
          ],
          getFieldByName: getFieldByNameFactory([
            {
              name: 'dateField',
              displayName: 'dateField',
              type: 'date',
              aggregatable: true,
              searchable: true,
              aggregationRestrictions: {
                date_histogram: {
                  agg: 'date_histogram',
                  time_zone: 'CET',
                  calendar_interval: 'w',
                },
              },
            },
          ]),
        }
      );
      expect(transferedColumn).toEqual(
        expect.objectContaining({
          params: {
            interval: 'w',
            timeZone: 'CET',
          },
        })
      );
    });

    it('should retain interval', () => {
      const transferedColumn = dateHistogramOperation.transfer!(
        {
          dataType: 'date',
          isBucketed: true,
          label: '',
          operationType: 'date_histogram',
          sourceField: 'dateField',
          params: {
            interval: '20s',
          },
        },
        {
          title: '',
          id: '',
          hasRestrictions: false,
          fields: [
            {
              name: 'dateField',
              displayName: 'dateField',
              type: 'date',
              aggregatable: true,
              searchable: true,
            },
          ],
          getFieldByName: getFieldByNameFactory([
            {
              name: 'dateField',
              displayName: 'dateField',
              type: 'date',
              aggregatable: true,
              searchable: true,
            },
          ]),
        }
      );
      expect(transferedColumn).toEqual(
        expect.objectContaining({
          params: {
            interval: '20s',
            timeZone: undefined,
          },
        })
      );
    });
  });

  describe('param editor', () => {
    it('should render current value', () => {
      const updateLayerSpy = jest.fn();
      const instance = shallow(
        <InlineOptions
          {...defaultOptions}
          layer={layer}
          updateLayer={updateLayerSpy}
          columnId="col1"
          currentColumn={layer.columns.col1 as DateHistogramIndexPatternColumn}
        />
      );

      expect(instance.find('[data-test-subj="lensDateHistogramValue"]').prop('value')).toEqual(42);
      expect(instance.find('[data-test-subj="lensDateHistogramUnit"]').prop('value')).toEqual('w');
    });

    it('should render current value for other index pattern', () => {
      const updateLayerSpy = jest.fn();

      const secondLayer: IndexPatternLayer = {
        indexPatternId: '2',
        columnOrder: ['col2'],
        columns: {
          col2: {
            label: 'Value of timestamp',
            dataType: 'date',
            isBucketed: true,

            // Private
            operationType: 'date_histogram',
            params: {
              interval: 'd',
            },
            sourceField: 'other_timestamp',
          },
        },
      };
      const instance = shallow(
        <InlineOptions
          {...defaultOptions}
          layer={secondLayer}
          updateLayer={updateLayerSpy}
          columnId="col2"
          currentColumn={secondLayer.columns.col2 as DateHistogramIndexPatternColumn}
          indexPattern={indexPattern2}
        />
      );

      expect(instance.find('[data-test-subj="lensDateHistogramValue"]').prop('value')).toEqual('');
      expect(instance.find('[data-test-subj="lensDateHistogramUnit"]').prop('value')).toEqual('d');
    });

    it('should render disabled switch and no time interval control for auto interval', () => {
      const thirdLayer: IndexPatternLayer = {
        indexPatternId: '1',
        columnOrder: ['col1'],
        columns: {
          col1: {
            label: 'Value of timestamp',
            dataType: 'date',
            isBucketed: true,

            // Private
            operationType: 'date_histogram',
            params: {
              interval: 'auto',
            },
            sourceField: 'timestamp',
          },
        },
      };

      const instance = shallow(
        <InlineOptions
          {...defaultOptions}
          layer={thirdLayer}
          updateLayer={jest.fn()}
          columnId="col1"
          currentColumn={thirdLayer.columns.col1 as DateHistogramIndexPatternColumn}
          indexPattern={indexPattern1}
        />
      );
      expect(instance.find('[data-test-subj="lensDateHistogramValue"]').exists()).toBeFalsy();
      expect(instance.find('[data-test-subj="lensDateHistogramUnit"]').exists()).toBeFalsy();
      expect(instance.find(EuiSwitch).prop('checked')).toBe(false);
    });

    it('should allow switching to manual interval', () => {
      const thirdLayer: IndexPatternLayer = {
        indexPatternId: '1',
        columnOrder: ['col1'],
        columns: {
          col1: {
            label: 'Value of timestamp',
            dataType: 'date',
            isBucketed: true,

            // Private
            operationType: 'date_histogram',
            params: {
              interval: 'auto',
            },
            sourceField: 'timestamp',
          },
        },
      };

      const updateLayerSpy = jest.fn();
      const instance = shallow(
        <InlineOptions
          {...defaultOptions}
          layer={thirdLayer}
          updateLayer={updateLayerSpy}
          columnId="col1"
          currentColumn={thirdLayer.columns.col1 as DateHistogramIndexPatternColumn}
        />
      );
      instance.find(EuiSwitch).prop('onChange')!({
        target: { checked: true },
      } as EuiSwitchEvent);
      expect(updateLayerSpy).toHaveBeenCalled();
      const newLayer = updateLayerSpy.mock.calls[0][0];
      expect(newLayer).toHaveProperty('columns.col1.params.interval', '30d');
    });

    it('should force calendar values to 1', () => {
      const updateLayerSpy = jest.fn();
      const instance = shallow(
        <InlineOptions
          {...defaultOptions}
          layer={layer}
          updateLayer={updateLayerSpy}
          columnId="col1"
          currentColumn={layer.columns.col1 as DateHistogramIndexPatternColumn}
        />
      );
      instance.find('[data-test-subj="lensDateHistogramValue"]').prop('onChange')!({
        target: {
          value: '2',
        },
      } as React.ChangeEvent<HTMLInputElement>);
      expect(updateLayerSpy).toHaveBeenCalledWith(layerWithInterval('1w'));
    });

    it('should display error if an invalid interval is specified', () => {
      const updateLayerSpy = jest.fn();
      const testLayer = layerWithInterval('4quid');
      const instance = shallow(
        <InlineOptions
          {...defaultOptions}
          layer={testLayer}
          updateLayer={updateLayerSpy}
          columnId="col1"
          currentColumn={testLayer.columns.col1 as DateHistogramIndexPatternColumn}
        />
      );
      expect(instance.find('[data-test-subj="lensDateHistogramError"]').exists()).toBeTruthy();
    });

    it('should not display error if interval value is blank', () => {
      const updateLayerSpy = jest.fn();
      const testLayer = layerWithInterval('d');
      const instance = shallow(
        <InlineOptions
          {...defaultOptions}
          layer={testLayer}
          updateLayer={updateLayerSpy}
          columnId="col1"
          currentColumn={testLayer.columns.col1 as DateHistogramIndexPatternColumn}
        />
      );
      expect(instance.find('[data-test-subj="lensDateHistogramError"]').exists()).toBeFalsy();
    });

    it('should display error if interval value is 0', () => {
      const updateLayerSpy = jest.fn();
      const testLayer = layerWithInterval('0d');
      const instance = shallow(
        <InlineOptions
          {...defaultOptions}
          layer={testLayer}
          updateLayer={updateLayerSpy}
          columnId="col1"
          currentColumn={testLayer.columns.col1 as DateHistogramIndexPatternColumn}
        />
      );
      expect(instance.find('[data-test-subj="lensDateHistogramError"]').exists()).toBeTruthy();
    });

    it('should update the unit', () => {
      const updateLayerSpy = jest.fn();
      const instance = shallow(
        <InlineOptions
          {...defaultOptions}
          layer={layer}
          updateLayer={updateLayerSpy}
          columnId="col1"
          currentColumn={layer.columns.col1 as DateHistogramIndexPatternColumn}
        />
      );
      instance.find('[data-test-subj="lensDateHistogramUnit"]').prop('onChange')!({
        target: {
          value: 'd',
        },
      } as React.ChangeEvent<HTMLInputElement>);
      expect(updateLayerSpy).toHaveBeenCalledWith(layerWithInterval('42d'));
    });

    it('should update the value', () => {
      const updateLayerSpy = jest.fn();
      const testLayer = layerWithInterval('42d');

      const instance = shallow(
        <InlineOptions
          {...defaultOptions}
          layer={testLayer}
          updateLayer={updateLayerSpy}
          columnId="col1"
          currentColumn={testLayer.columns.col1 as DateHistogramIndexPatternColumn}
        />
      );
      instance.find('[data-test-subj="lensDateHistogramValue"]').prop('onChange')!({
        target: {
          value: '9',
        },
      } as React.ChangeEvent<HTMLInputElement>);
      expect(updateLayerSpy).toHaveBeenCalledWith(layerWithInterval('9d'));
    });

    it('should not render options if they are restricted', () => {
      const updateLayerSpy = jest.fn();

      const indexPattern = {
        ...indexPattern1,
        fields: [
          {
            ...indexPattern1.fields[0],
            aggregationRestrictions: {
              date_histogram: {
                agg: 'date_histogram',
                time_zone: 'UTC',
                calendar_interval: '1h',
              },
            },
          },
        ],
        getFieldByName: getFieldByNameFactory([
          {
            ...indexPattern1.fields[0],
            aggregationRestrictions: {
              date_histogram: {
                agg: 'date_histogram',
                time_zone: 'UTC',
                calendar_interval: '1h',
              },
            },
          },
        ]),
      };

      const instance = shallow(
        <InlineOptions
          {...defaultOptions}
          layer={layer}
          indexPattern={indexPattern}
          updateLayer={updateLayerSpy}
          columnId="col1"
          currentColumn={layer.columns.col1 as DateHistogramIndexPatternColumn}
        />
      );

      expect(instance.find('[data-test-subj="lensDateHistogramValue"]').exists()).toBeFalsy();
    });
  });

  describe('getDefaultLabel', () => {
    it('should not throw when the source field is not located', () => {
      expect(
        dateHistogramOperation.getDefaultLabel(
          {
            label: '',
            dataType: 'date',
            isBucketed: true,
            operationType: 'date_histogram',
            sourceField: 'missing',
            params: { interval: 'auto' },
          },
          indexPattern1,
          {
            col1: {
              label: '',
              dataType: 'date',
              isBucketed: true,
              operationType: 'date_histogram',
              sourceField: 'missing',
              params: { interval: 'auto' },
            },
          }
        )
      ).toEqual('Missing field');
    });
  });
});
