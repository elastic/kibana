/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { shallow } from 'enzyme';
import { EuiComboBox } from '@elastic/eui';
import { IUiSettingsClient, SavedObjectsClientContract, HttpSetup } from 'kibana/public';
import { IStorageWrapper } from 'src/plugins/kibana_utils/public';
import { dataPluginMock } from '../../../../../../../src/plugins/data/public/mocks';
import { createMockedIndexPattern } from '../../mocks';
import { LastValueIndexPatternColumn } from './last_value';
import { lastValueOperation } from './index';
import type { IndexPattern, IndexPatternLayer } from '../../types';

const uiSettingsMock = {} as IUiSettingsClient;

const defaultProps = {
  storage: {} as IStorageWrapper,
  uiSettings: uiSettingsMock,
  savedObjectsClient: {} as SavedObjectsClientContract,
  dateRange: { fromDate: 'now-1d', toDate: 'now' },
  data: dataPluginMock.createStartContract(),
  http: {} as HttpSetup,
  indexPattern: {
    ...createMockedIndexPattern(),
    hasRestrictions: false,
  } as IndexPattern,
  operationDefinitionMap: {},
  isFullscreen: false,
  toggleFullscreen: jest.fn(),
  setIsCloseable: jest.fn(),
  layerId: '1',
};

describe('last_value', () => {
  let layer: IndexPatternLayer;
  const InlineOptions = lastValueOperation.paramEditor!;

  beforeEach(() => {
    layer = {
      indexPatternId: '1',
      columnOrder: ['col1', 'col2'],
      columns: {
        col1: {
          label: 'Top value of category',
          dataType: 'string',
          isBucketed: true,
          operationType: 'terms',
          params: {
            orderBy: { type: 'alphabetical' },
            size: 3,
            orderDirection: 'asc',
          },
          sourceField: 'category',
        },
        col2: {
          label: 'Last value of a',
          dataType: 'number',
          isBucketed: false,
          sourceField: 'a',
          operationType: 'last_value',
          params: {
            sortField: 'datefield',
          },
        },
      },
    };
  });

  describe('toEsAggsFn', () => {
    it('should reflect params correctly', () => {
      const lastValueColumn = layer.columns.col2 as LastValueIndexPatternColumn;
      const esAggsFn = lastValueOperation.toEsAggsFn(
        { ...lastValueColumn, params: { ...lastValueColumn.params } },
        'col1',
        {} as IndexPattern,
        layer,
        uiSettingsMock,
        []
      );
      expect(esAggsFn).toEqual(
        expect.objectContaining({
          arguments: expect.objectContaining({
            aggregate: ['concat'],
            field: ['a'],
            size: [1],
            sortField: ['datefield'],
            sortOrder: ['desc'],
          }),
        })
      );
    });
  });

  describe('onFieldChange', () => {
    it('should change correctly to new field', () => {
      const oldColumn: LastValueIndexPatternColumn = {
        operationType: 'last_value',
        sourceField: 'source',
        label: 'Last value of source',
        isBucketed: true,
        dataType: 'string',
        params: {
          sortField: 'datefield',
        },
      };
      const indexPattern = createMockedIndexPattern();
      const newNumberField = indexPattern.getFieldByName('bytes')!;
      const column = lastValueOperation.onFieldChange(oldColumn, newNumberField);

      expect(column).toEqual(
        expect.objectContaining({
          dataType: 'number',
          sourceField: 'bytes',
          params: expect.objectContaining({
            sortField: 'datefield',
          }),
        })
      );
      expect(column.label).toContain('bytes');
    });

    it('should remove numeric parameters when changing away from number', () => {
      const oldColumn: LastValueIndexPatternColumn = {
        operationType: 'last_value',
        sourceField: 'bytes',
        label: 'Last value of bytes',
        isBucketed: false,
        dataType: 'number',
        params: {
          sortField: 'datefield',
        },
      };
      const indexPattern = createMockedIndexPattern();
      const newStringField = indexPattern.fields.find((i) => i.name === 'source')!;

      const column = lastValueOperation.onFieldChange(oldColumn, newStringField);
      expect(column).toHaveProperty('dataType', 'string');
      expect(column).toHaveProperty('sourceField', 'source');
      expect(column.params.format).toBeUndefined();
    });
  });

  describe('getPossibleOperationForField', () => {
    it('should return operation with the right type', () => {
      expect(
        lastValueOperation.getPossibleOperationForField({
          aggregatable: true,
          searchable: true,
          name: 'test',
          displayName: 'test',
          type: 'boolean',
        })
      ).toEqual({
        dataType: 'boolean',
        isBucketed: false,
        scale: 'ratio',
      });

      expect(
        lastValueOperation.getPossibleOperationForField({
          aggregatable: true,
          searchable: true,
          name: 'test',
          displayName: 'test',
          type: 'ip',
        })
      ).toEqual({
        dataType: 'ip',
        isBucketed: false,
        scale: 'ratio',
      });
    });

    it('should not return an operation if restrictions prevent terms', () => {
      expect(
        lastValueOperation.getPossibleOperationForField({
          aggregatable: true,
          searchable: true,
          name: 'test',
          displayName: 'test',
          type: 'string',
          aggregationRestrictions: {
            terms: {
              agg: 'terms',
            },
          },
        })
      ).toEqual(undefined);

      expect(
        lastValueOperation.getPossibleOperationForField({
          aggregatable: true,
          aggregationRestrictions: {},
          searchable: true,
          name: 'test',
          displayName: 'test',
          type: 'string',
        })
      ).toEqual(undefined);
      // does it have to be aggregatable?
      expect(
        lastValueOperation.getPossibleOperationForField({
          aggregatable: false,
          searchable: true,
          name: 'test',
          displayName: 'test',
          type: 'string',
        })
      ).toEqual({ dataType: 'string', isBucketed: false, scale: 'ordinal' });
    });
  });

  describe('buildColumn', () => {
    it('should use type from the passed field', () => {
      const lastValueColumn = lastValueOperation.buildColumn({
        indexPattern: createMockedIndexPattern(),
        field: {
          aggregatable: true,
          searchable: true,
          type: 'boolean',
          name: 'test',
          displayName: 'test',
        },
        layer: { columns: {}, columnOrder: [], indexPatternId: '' },
      });
      expect(lastValueColumn.dataType).toEqual('boolean');
    });

    it('should use indexPattern timeFieldName as a default sortField', () => {
      const lastValueColumn = lastValueOperation.buildColumn({
        indexPattern: createMockedIndexPattern(),

        layer: {
          columns: {
            col1: {
              label: 'Count',
              dataType: 'number',
              isBucketed: false,
              sourceField: 'Records',
              operationType: 'count',
            },
          },
          columnOrder: [],
          indexPatternId: '',
        },

        field: {
          aggregatable: true,
          searchable: true,
          type: 'boolean',
          name: 'test',
          displayName: 'test',
        },
      });
      expect(lastValueColumn.params).toEqual(
        expect.objectContaining({
          sortField: 'timestamp',
        })
      );
    });

    it('should use first indexPattern date field if there is no default timefieldName', () => {
      const indexPattern = createMockedIndexPattern();
      const indexPatternNoTimeField = {
        ...indexPattern,
        timeFieldName: undefined,
        fields: [
          {
            aggregatable: true,
            searchable: true,
            type: 'date',
            name: 'datefield',
            displayName: 'datefield',
          },
          {
            aggregatable: true,
            searchable: true,
            type: 'boolean',
            name: 'test',
            displayName: 'test',
          },
        ],
      };
      const lastValueColumn = lastValueOperation.buildColumn({
        indexPattern: indexPatternNoTimeField,

        layer: {
          columns: {
            col1: {
              label: 'Count',
              dataType: 'number',
              isBucketed: false,
              sourceField: 'Records',
              operationType: 'count',
            },
          },
          columnOrder: [],
          indexPatternId: '',
        },

        field: {
          aggregatable: true,
          searchable: true,
          type: 'boolean',
          name: 'test',
          displayName: 'test',
        },
      });
      expect(lastValueColumn.params).toEqual(
        expect.objectContaining({
          sortField: 'datefield',
        })
      );
    });
  });

  it('should return disabledStatus if indexPattern does contain date field', () => {
    const indexPattern = createMockedIndexPattern();

    expect(lastValueOperation.getDisabledStatus!(indexPattern, layer)).toEqual(undefined);

    const indexPatternWithoutTimeFieldName = {
      ...indexPattern,
      timeFieldName: undefined,
    };
    expect(lastValueOperation.getDisabledStatus!(indexPatternWithoutTimeFieldName, layer)).toEqual(
      undefined
    );

    const indexPatternWithoutTimefields = {
      ...indexPatternWithoutTimeFieldName,
      fields: indexPattern.fields.filter((f) => f.type !== 'date'),
    };

    const disabledStatus = lastValueOperation.getDisabledStatus!(
      indexPatternWithoutTimefields,
      layer
    );
    expect(disabledStatus).toEqual(
      'This function requires the presence of a date field in your index'
    );
  });

  it('should pick the previous format configuration if set', () => {
    const indexPattern = createMockedIndexPattern();
    expect(
      lastValueOperation.buildColumn({
        indexPattern,
        layer: {
          columns: {
            col1: {
              label: 'Count',
              dataType: 'number',
              isBucketed: false,
              sourceField: 'Records',
              operationType: 'count',
            },
          },
          columnOrder: [],
          indexPatternId: '',
        },

        field: {
          aggregatable: true,
          searchable: true,
          type: 'boolean',
          name: 'test',
          displayName: 'test',
        },
        previousColumn: {
          label: 'Count',
          dataType: 'number',
          isBucketed: false,
          sourceField: 'Records',
          operationType: 'count',
          params: {
            format: {
              id: 'number',
              params: {
                decimals: 2,
              },
            },
          },
        },
      }).params
    ).toEqual(
      expect.objectContaining({
        format: {
          id: 'number',
          params: {
            decimals: 2,
          },
        },
      })
    );
  });

  describe('param editor', () => {
    it('should render current sortField', () => {
      const updateLayerSpy = jest.fn();
      const instance = shallow(
        <InlineOptions
          {...defaultProps}
          layer={layer}
          updateLayer={updateLayerSpy}
          columnId="col1"
          currentColumn={layer.columns.col2 as LastValueIndexPatternColumn}
        />
      );

      const select = instance.find('[data-test-subj="lns-indexPattern-lastValue-sortField"]');

      expect(select.prop('selectedOptions')).toEqual([{ label: 'datefield', value: 'datefield' }]);
    });

    it('should update state when changing sortField', () => {
      const updateLayerSpy = jest.fn();
      const instance = shallow(
        <InlineOptions
          {...defaultProps}
          layer={layer}
          updateLayer={updateLayerSpy}
          columnId="col2"
          currentColumn={layer.columns.col2 as LastValueIndexPatternColumn}
        />
      );

      instance
        .find('[data-test-subj="lns-indexPattern-lastValue-sortField"]')
        .find(EuiComboBox)
        .prop('onChange')!([{ label: 'datefield2', value: 'datefield2' }]);

      expect(updateLayerSpy).toHaveBeenCalledWith({
        ...layer,
        columns: {
          ...layer.columns,
          col2: {
            ...layer.columns.col2,
            params: {
              ...(layer.columns.col2 as LastValueIndexPatternColumn).params,
              sortField: 'datefield2',
            },
          },
        },
      });
    });
  });

  describe('getErrorMessage', () => {
    let indexPattern: IndexPattern;
    let errorLayer: IndexPatternLayer;
    beforeEach(() => {
      indexPattern = createMockedIndexPattern();
      errorLayer = {
        columns: {
          col1: {
            dataType: 'boolean',
            isBucketed: false,
            label: 'Last value of test',
            operationType: 'last_value',
            params: { sortField: 'timestamp' },
            scale: 'ratio',
            sourceField: 'bytes',
          },
        },
        columnOrder: [],
        indexPatternId: '',
      };
    });
    it('returns undefined if sourceField exists and sortField is of type date ', () => {
      expect(lastValueOperation.getErrorMessage!(errorLayer, 'col1', indexPattern)).toEqual(
        undefined
      );
    });
    it('shows error message if the sourceField does not exist in index pattern', () => {
      errorLayer = {
        ...errorLayer,
        columns: {
          col1: {
            ...errorLayer.columns.col1,
            sourceField: 'notExisting',
          } as LastValueIndexPatternColumn,
        },
      };
      expect(lastValueOperation.getErrorMessage!(errorLayer, 'col1', indexPattern)).toEqual([
        'Field notExisting was not found',
      ]);
    });
    it('shows error message  if the sortField does not exist in index pattern', () => {
      errorLayer = {
        ...errorLayer,
        columns: {
          col1: {
            ...errorLayer.columns.col1,
            params: {
              ...errorLayer.columns.col1.params,
              sortField: 'notExisting',
            },
          } as LastValueIndexPatternColumn,
        },
      };
      expect(lastValueOperation.getErrorMessage!(errorLayer, 'col1', indexPattern)).toEqual([
        'Field notExisting was not found',
      ]);
    });
    it('shows error message if the sortField is not date', () => {
      errorLayer = {
        ...errorLayer,
        columns: {
          col1: {
            ...errorLayer.columns.col1,
            params: {
              ...errorLayer.columns.col1.params,
              sortField: 'bytes',
            },
          } as LastValueIndexPatternColumn,
        },
      };
      expect(lastValueOperation.getErrorMessage!(errorLayer, 'col1', indexPattern)).toEqual([
        'Field bytes is not a date field and cannot be used for sorting',
      ]);
    });
  });
});
