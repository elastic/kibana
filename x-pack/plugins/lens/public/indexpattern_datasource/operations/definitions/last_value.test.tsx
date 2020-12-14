/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
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
import { IndexPatternPrivateState, IndexPattern, IndexPatternLayer } from '../../types';

const defaultProps = {
  storage: {} as IStorageWrapper,
  uiSettings: {} as IUiSettingsClient,
  savedObjectsClient: {} as SavedObjectsClientContract,
  dateRange: { fromDate: 'now-1d', toDate: 'now' },
  data: dataPluginMock.createStartContract(),
  http: {} as HttpSetup,
};

describe('last_value', () => {
  let state: IndexPatternPrivateState;
  const InlineOptions = lastValueOperation.paramEditor!;

  beforeEach(() => {
    const indexPattern = createMockedIndexPattern();
    state = {
      indexPatternRefs: [],
      indexPatterns: {
        '1': {
          ...indexPattern,
          hasRestrictions: false,
        } as IndexPattern,
      },
      existingFields: {},
      currentIndexPatternId: '1',
      isFirstExistenceFetch: false,
      layers: {
        first: {
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
        },
      },
    };
  });

  describe('toEsAggsFn', () => {
    it('should reflect params correctly', () => {
      const lastValueColumn = state.layers.first.columns.col2 as LastValueIndexPatternColumn;
      const esAggsFn = lastValueOperation.toEsAggsFn(
        { ...lastValueColumn, params: { ...lastValueColumn.params } },
        'col1',
        {} as IndexPattern
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

    expect(lastValueOperation.getDisabledStatus!(indexPattern)).toEqual(undefined);

    const indexPatternWithoutTimeFieldName = {
      ...indexPattern,
      timeFieldName: undefined,
    };
    expect(lastValueOperation.getDisabledStatus!(indexPatternWithoutTimeFieldName)).toEqual(
      undefined
    );

    const indexPatternWithoutTimefields = {
      ...indexPatternWithoutTimeFieldName,
      fields: indexPattern.fields.filter((f) => f.type !== 'date'),
    };

    const disabledStatus = lastValueOperation.getDisabledStatus!(indexPatternWithoutTimefields);
    expect(disabledStatus).toEqual(
      'This function requires the presence of a date field in your index'
    );
  });

  describe('param editor', () => {
    it('should render current sortField', () => {
      const setStateSpy = jest.fn();
      const instance = shallow(
        <InlineOptions
          {...defaultProps}
          state={state}
          setState={setStateSpy}
          columnId="col1"
          currentColumn={state.layers.first.columns.col2 as LastValueIndexPatternColumn}
          layerId="first"
        />
      );

      const select = instance.find('[data-test-subj="lns-indexPattern-lastValue-sortField"]');

      expect(select.prop('selectedOptions')).toEqual([{ label: 'datefield', value: 'datefield' }]);
    });

    it('should update state when changing sortField', () => {
      const setStateSpy = jest.fn();
      const instance = shallow(
        <InlineOptions
          {...defaultProps}
          state={state}
          setState={setStateSpy}
          columnId="col1"
          currentColumn={state.layers.first.columns.col2 as LastValueIndexPatternColumn}
          layerId="first"
        />
      );

      instance
        .find('[data-test-subj="lns-indexPattern-lastValue-sortField"]')
        .find(EuiComboBox)
        .prop('onChange')!([{ label: 'datefield2', value: 'datefield2' }]);

      expect(setStateSpy).toHaveBeenCalledWith({
        ...state,
        layers: {
          first: {
            ...state.layers.first,
            columns: {
              ...state.layers.first.columns,
              col2: {
                ...state.layers.first.columns.col2,
                params: {
                  ...(state.layers.first.columns.col2 as LastValueIndexPatternColumn).params,
                  sortField: 'datefield2',
                },
              },
            },
          },
        },
      });
    });
  });

  describe('getErrorMessage', () => {
    let indexPattern: IndexPattern;
    let layer: IndexPatternLayer;
    beforeEach(() => {
      indexPattern = createMockedIndexPattern();
      layer = {
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
      expect(lastValueOperation.getErrorMessage!(layer, 'col1', indexPattern)).toEqual(undefined);
    });
    it('shows error message if the sourceField does not exist in index pattern', () => {
      layer = {
        ...layer,
        columns: {
          col1: {
            ...layer.columns.col1,
            sourceField: 'notExisting',
          } as LastValueIndexPatternColumn,
        },
      };
      expect(lastValueOperation.getErrorMessage!(layer, 'col1', indexPattern)).toEqual([
        'Field notExisting was not found',
      ]);
    });
    it('shows error message  if the sortField does not exist in index pattern', () => {
      layer = {
        ...layer,
        columns: {
          col1: {
            ...layer.columns.col1,
            params: {
              ...layer.columns.col1.params,
              sortField: 'notExisting',
            },
          } as LastValueIndexPatternColumn,
        },
      };
      expect(lastValueOperation.getErrorMessage!(layer, 'col1', indexPattern)).toEqual([
        'Field notExisting was not found',
      ]);
    });
    it('shows error message if the sortField is not date', () => {
      layer = {
        ...layer,
        columns: {
          col1: {
            ...layer.columns.col1,
            params: {
              ...layer.columns.col1.params,
              sortField: 'bytes',
            },
          } as LastValueIndexPatternColumn,
        },
      };
      expect(lastValueOperation.getErrorMessage!(layer, 'col1', indexPattern)).toEqual([
        'Field bytes is not a date field and cannot be used for sorting',
      ]);
    });
  });
});
