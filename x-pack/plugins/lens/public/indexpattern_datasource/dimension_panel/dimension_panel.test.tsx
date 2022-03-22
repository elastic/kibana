/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ReactWrapper, ShallowWrapper } from 'enzyme';
import React from 'react';
import { act } from 'react-dom/test-utils';
import {
  EuiComboBox,
  EuiListGroupItemProps,
  EuiListGroup,
  EuiRange,
  EuiSelect,
  EuiButtonIcon,
} from '@elastic/eui';
import { DataPublicPluginStart } from '../../../../../../src/plugins/data/public';
import {
  IndexPatternDimensionEditorComponent,
  IndexPatternDimensionEditorProps,
} from './dimension_panel';
import { mountWithIntl as mount, shallowWithIntl as shallow } from '@kbn/test-jest-helpers';
import { IUiSettingsClient, SavedObjectsClientContract, HttpSetup, CoreSetup } from 'kibana/public';
import { IStorageWrapper } from 'src/plugins/kibana_utils/public';
import { generateId } from '../../id_generator';
import { IndexPatternPrivateState } from '../types';
import {
  FiltersIndexPatternColumn,
  GenericIndexPatternColumn,
  replaceColumn,
  TermsIndexPatternColumn,
} from '../operations';
import { documentField } from '../document_field';
import { OperationMetadata } from '../../types';
import { DateHistogramIndexPatternColumn } from '../operations/definitions/date_histogram';
import { getFieldByNameFactory } from '../pure_helpers';
import { Filtering, setFilter } from './filtering';
import { TimeShift } from './time_shift';
import { DimensionEditor } from './dimension_editor';
import { AdvancedOptions } from './advanced_options';
import { layerTypes } from '../../../common';

jest.mock('../loader');
jest.mock('../query_input', () => ({
  QueryInput: () => null,
}));
jest.mock('../operations');
jest.mock('lodash', () => {
  const original = jest.requireActual('lodash');

  return {
    ...original,
    debounce: (fn: unknown) => fn,
  };
});
jest.mock('../../id_generator');
// Mock the Monaco Editor component
jest.mock('../operations/definitions/formula/editor/formula_editor', () => {
  return {
    WrappedFormulaEditor: () => <div />,
    FormulaEditor: () => <div />,
  };
});

const fields = [
  {
    name: 'timestamp',
    displayName: 'timestampLabel',
    type: 'date',
    aggregatable: true,
    searchable: true,
    exists: true,
  },
  {
    name: 'bytes',
    displayName: 'bytes',
    type: 'number',
    aggregatable: true,
    searchable: true,
    exists: true,
  },
  {
    name: 'memory',
    displayName: 'memory',
    type: 'number',
    aggregatable: true,
    searchable: true,
    exists: true,
  },
  {
    name: 'source',
    displayName: 'source',
    type: 'string',
    aggregatable: true,
    searchable: true,
    exists: true,
  },
  documentField,
];

const expectedIndexPatterns = {
  1: {
    id: '1',
    title: 'my-fake-index-pattern',
    timeFieldName: 'timestamp',
    hasExistence: true,
    hasRestrictions: false,
    fields,
    getFieldByName: getFieldByNameFactory(fields),
  },
};

const bytesColumn: GenericIndexPatternColumn = {
  label: 'Sum of bytes',
  dataType: 'number',
  isBucketed: false,

  // Private
  operationType: 'sum',
  sourceField: 'bytes',
  params: { format: { id: 'bytes' } },
};

/**
 * The datasource exposes four main pieces of code which are tested at
 * an integration test level. The main reason for this fairly high level
 * of testing is that there is a lot of UI logic that isn't easily
 * unit tested, such as the transient invalid state.
 *
 * - Dimension trigger: Not tested here
 * - Dimension editor component: First half of the tests
 */
describe('IndexPatternDimensionEditorPanel', () => {
  let state: IndexPatternPrivateState;
  let setState: jest.Mock;
  let defaultProps: IndexPatternDimensionEditorProps;

  function getStateWithColumns(columns: Record<string, GenericIndexPatternColumn>) {
    return {
      ...state,
      layers: { first: { ...state.layers.first, columns, columnOrder: Object.keys(columns) } },
    };
  }

  beforeEach(() => {
    state = {
      indexPatternRefs: [],
      indexPatterns: expectedIndexPatterns,
      currentIndexPatternId: '1',
      isFirstExistenceFetch: false,
      existingFields: {
        'my-fake-index-pattern': {
          timestamp: true,
          bytes: true,
          memory: true,
          source: true,
        },
      },
      layers: {
        first: {
          indexPatternId: '1',
          columnOrder: ['col1'],
          columns: {
            col1: {
              label: 'Date histogram of timestamp',
              customLabel: true,
              dataType: 'date',
              isBucketed: true,

              // Private
              operationType: 'date_histogram',
              params: {
                interval: '1d',
              },
              sourceField: 'timestamp',
            } as DateHistogramIndexPatternColumn,
          },
          incompleteColumns: {},
        },
      },
    };

    setState = jest.fn().mockImplementation((newState) => {
      if (wrapper instanceof ReactWrapper) {
        wrapper.setProps({
          state: typeof newState === 'function' ? newState(wrapper.prop('state')) : newState,
        });
      }
    });

    defaultProps = {
      state,
      setState,
      dateRange: { fromDate: 'now-1d', toDate: 'now' },
      columnId: 'col1',
      layerId: 'first',
      layerType: layerTypes.DATA,
      uniqueLabel: 'stuff',
      filterOperations: () => true,
      storage: {} as IStorageWrapper,
      uiSettings: {} as IUiSettingsClient,
      savedObjectsClient: {} as SavedObjectsClientContract,
      http: {} as HttpSetup,
      data: {
        fieldFormats: {
          getType: jest.fn().mockReturnValue({
            id: 'number',
            title: 'Number',
          }),
          getDefaultType: jest.fn().mockReturnValue({
            id: 'bytes',
            title: 'Bytes',
          }),
          deserialize: jest.fn().mockReturnValue({
            convert: () => 'formatted',
          }),
        },
        search: {
          aggs: {
            calculateAutoTimeExpression: jest.fn(),
          },
        },
      } as unknown as DataPublicPluginStart,
      core: {} as CoreSetup,
      dimensionGroups: [],
      groupId: 'a',
      isFullscreen: false,
      supportStaticValue: false,
      toggleFullscreen: jest.fn(),
    };

    jest.clearAllMocks();
  });

  let wrapper: ReactWrapper | ShallowWrapper;

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount();
    }
  });

  it('should call the filterOperations function', () => {
    const filterOperations = jest.fn().mockReturnValue(true);

    wrapper = shallow(
      <IndexPatternDimensionEditorComponent {...defaultProps} filterOperations={filterOperations} />
    );

    expect(filterOperations).toBeCalled();
  });

  it('should show field select', () => {
    wrapper = mount(<IndexPatternDimensionEditorComponent {...defaultProps} />);

    expect(
      wrapper.find(EuiComboBox).filter('[data-test-subj="indexPattern-dimension-field"]')
    ).toHaveLength(1);
  });

  it('should not show field select on fieldless operation', () => {
    wrapper = mount(
      <IndexPatternDimensionEditorComponent
        {...defaultProps}
        state={getStateWithColumns({
          col1: {
            label: 'Filters',
            dataType: 'string',
            isBucketed: false,

            // Private
            operationType: 'filters',
            params: { filters: [] },
          } as FiltersIndexPatternColumn,
        })}
      />
    );

    expect(
      wrapper.find(EuiComboBox).filter('[data-test-subj="indexPattern-dimension-field"]')
    ).toHaveLength(0);
  });

  it('should not show any choices if the filter returns false', () => {
    wrapper = mount(
      <IndexPatternDimensionEditorComponent
        {...defaultProps}
        columnId={'col2'}
        filterOperations={() => false}
      />
    );

    expect(
      wrapper
        .find(EuiComboBox)
        .filter('[data-test-subj="indexPattern-dimension-field"]')!
        .prop('options')!
    ).toHaveLength(0);
  });

  it('should list all field names and document as a whole in prioritized order', () => {
    wrapper = mount(<IndexPatternDimensionEditorComponent {...defaultProps} />);

    const options = wrapper
      .find(EuiComboBox)
      .filter('[data-test-subj="indexPattern-dimension-field"]')
      .prop('options');

    expect(options).toHaveLength(2);

    expect(options![0].label).toEqual('Records');
    expect(options![1].options!.map(({ label }) => label)).toEqual([
      'timestampLabel',
      'bytes',
      'memory',
      'source',
    ]);
  });

  it('should hide fields that have no data', () => {
    const props = {
      ...defaultProps,
      state: {
        ...defaultProps.state,
        existingFields: {
          'my-fake-index-pattern': {
            timestamp: true,
            source: true,
          },
        },
      },
    };
    wrapper = mount(<IndexPatternDimensionEditorComponent {...props} />);

    const options = wrapper
      .find(EuiComboBox)
      .filter('[data-test-subj="indexPattern-dimension-field"]')
      .prop('options');

    expect(options![1].options!.map(({ label }) => label)).toEqual(['timestampLabel', 'source']);
  });

  it('should indicate fields which are incompatible for the operation of the current column', () => {
    wrapper = mount(
      <IndexPatternDimensionEditorComponent
        {...defaultProps}
        state={getStateWithColumns({ col1: bytesColumn })}
      />
    );

    const options = wrapper
      .find(EuiComboBox)
      .filter('[data-test-subj="indexPattern-dimension-field"]')
      .prop('options');

    expect(options![0]['data-test-subj']).toEqual('lns-fieldOptionIncompatible-___records___');

    expect(
      options![1].options!.filter(({ label }) => label === 'timestampLabel')[0]['data-test-subj']
    ).toContain('Incompatible');
    expect(
      options![1].options!.filter(({ label }) => label === 'memory')[0]['data-test-subj']
    ).not.toContain('Incompatible');
  });

  it('should indicate operations which are incompatible for the field of the current column', () => {
    wrapper = mount(
      <IndexPatternDimensionEditorComponent
        {...defaultProps}
        state={getStateWithColumns({ col1: bytesColumn })}
      />
    );

    const items: EuiListGroupItemProps[] = wrapper.find(EuiListGroup).prop('listItems') || [];

    expect(items.find(({ id }) => id === 'min')!['data-test-subj']).not.toContain('incompatible');
    expect(items.find(({ id }) => id === 'date_histogram')!['data-test-subj']).toContain(
      'incompatible'
    );
    // Incompatible because there is no date field
    expect(items.find(({ id }) => id === 'cumulative_sum')!['data-test-subj']).toContain(
      'incompatible'
    );

    expect(items.find(({ id }) => id === 'filters')!['data-test-subj']).not.toContain(
      'incompatible'
    );
  });

  it('should indicate when a transition is invalid due to filterOperations', () => {
    wrapper = mount(
      <IndexPatternDimensionEditorComponent
        {...defaultProps}
        state={getStateWithColumns({
          col1: {
            label: 'Unique count of source',
            dataType: 'number',
            isBucketed: false,
            operationType: 'unique_count',
            sourceField: 'source,',
          },
        })}
        filterOperations={(meta) => meta.dataType === 'number' && !meta.isBucketed}
      />
    );

    const items: EuiListGroupItemProps[] = wrapper.find(EuiListGroup).prop('listItems') || [];

    expect(items.find(({ id }) => id === 'min')!['data-test-subj']).toContain('incompatible');
    expect(items.find(({ id }) => id === 'cumulative_sum')!['data-test-subj']).toContain(
      'incompatible'
    );
  });

  it('should not display hidden operation types', () => {
    wrapper = mount(<IndexPatternDimensionEditorComponent {...defaultProps} />);

    const items: EuiListGroupItemProps[] = wrapper.find(EuiListGroup).prop('listItems') || [];

    ['math', 'formula', 'static_value'].forEach((hiddenOp) => {
      expect(items.some(({ id }) => id === hiddenOp)).toBe(false);
    });
  });

  it('should indicate that reference-based operations are not compatible when they are incomplete', () => {
    wrapper = mount(
      <IndexPatternDimensionEditorComponent
        {...defaultProps}
        state={getStateWithColumns({
          date: {
            label: 'Date',
            dataType: 'date',
            isBucketed: true,
            operationType: 'date_histogram',
            sourceField: '@timestamp',
            params: { interval: 'auto' },
          } as DateHistogramIndexPatternColumn,
          col1: {
            label: 'Counter rate',
            dataType: 'number',
            isBucketed: false,
            operationType: 'counter_rate',
            references: ['ref'],
          },
        })}
      />
    );

    const items: EuiListGroupItemProps[] = wrapper.find(EuiListGroup).prop('listItems') || [];

    expect(items.find(({ id }) => id === 'differences')!['data-test-subj']).toContain(
      'incompatible'
    );
    expect(items.find(({ id }) => id === 'cumulative_sum')!['data-test-subj']).toContain(
      'incompatible'
    );
    expect(items.find(({ id }) => id === 'moving_average')!['data-test-subj']).toContain(
      'incompatible'
    );
  });

  it('should indicate that reference-based operations are compatible sometimes', () => {
    wrapper = mount(
      <IndexPatternDimensionEditorComponent
        {...defaultProps}
        state={getStateWithColumns({
          date: {
            label: 'Date',
            dataType: 'date',
            isBucketed: true,
            operationType: 'date_histogram',
            sourceField: '@timestamp',
            params: { interval: 'auto' },
          } as DateHistogramIndexPatternColumn,
          col1: {
            label: 'Cumulative sum',
            dataType: 'number',
            isBucketed: false,
            operationType: 'cumulative_sum',
            references: ['ref'],
          },
          ref: {
            label: 'Count',
            dataType: 'number',
            isBucketed: false,
            operationType: 'count',
            sourceField: '___records___',
          },
        })}
      />
    );

    const items: EuiListGroupItemProps[] = wrapper.find(EuiListGroup).prop('listItems') || [];

    expect(items.find(({ id }) => id === 'counter_rate')!['data-test-subj']).toContain(
      'incompatible'
    );

    expect(items.find(({ id }) => id === 'differences')!['data-test-subj']).not.toContain(
      'incompatible'
    );
    expect(items.find(({ id }) => id === 'moving_average')!['data-test-subj']).not.toContain(
      'incompatible'
    );
  });

  it('should keep the operation when switching to another field compatible with this operation', () => {
    const initialState: IndexPatternPrivateState = getStateWithColumns({ col1: bytesColumn });

    wrapper = mount(
      <IndexPatternDimensionEditorComponent {...defaultProps} state={initialState} />
    );

    const comboBox = wrapper
      .find(EuiComboBox)
      .filter('[data-test-subj="indexPattern-dimension-field"]')!;
    const option = comboBox.prop('options')![1].options!.find(({ label }) => label === 'memory')!;

    act(() => {
      comboBox.prop('onChange')!([option]);
    });

    expect(setState.mock.calls[0]).toEqual([
      expect.any(Function),
      { isDimensionComplete: true, forceRender: false },
    ]);
    expect(setState.mock.calls[0][0](defaultProps.state)).toEqual({
      ...initialState,
      layers: {
        first: {
          ...state.layers.first,
          columns: {
            ...state.layers.first.columns,
            col1: expect.objectContaining({
              operationType: 'sum',
              sourceField: 'memory',
              params: { format: { id: 'bytes' } },
              // Other parts of this don't matter for this test
            }),
          },
        },
      },
    });
  });

  it('should switch operations when selecting a field that requires another operation', () => {
    wrapper = mount(<IndexPatternDimensionEditorComponent {...defaultProps} />);

    const comboBox = wrapper
      .find(EuiComboBox)
      .filter('[data-test-subj="indexPattern-dimension-field"]')!;
    const option = comboBox.prop('options')![1].options!.find(({ label }) => label === 'source')!;

    act(() => {
      comboBox.prop('onChange')!([option]);
    });

    expect(setState.mock.calls[0]).toEqual([
      expect.any(Function),
      { isDimensionComplete: true, forceRender: false },
    ]);
    expect(setState.mock.calls[0][0](defaultProps.state)).toEqual({
      ...state,
      layers: {
        first: {
          ...state.layers.first,
          columns: {
            ...state.layers.first.columns,
            col1: expect.objectContaining({
              operationType: 'terms',
              sourceField: 'source',
              // Other parts of this don't matter for this test
            }),
          },
        },
      },
    });
  });

  it('should keep the field when switching to another operation compatible for this field', () => {
    wrapper = mount(
      <IndexPatternDimensionEditorComponent
        {...defaultProps}
        state={getStateWithColumns({ col1: bytesColumn })}
      />
    );

    act(() => {
      wrapper.find('button[data-test-subj="lns-indexPatternDimension-min"]').simulate('click');
    });

    expect(setState.mock.calls[0]).toEqual([expect.any(Function), { isDimensionComplete: true }]);
    expect(setState.mock.calls[0][0](state)).toEqual({
      ...state,
      layers: {
        first: {
          ...state.layers.first,
          columns: {
            ...state.layers.first.columns,
            col1: expect.objectContaining({
              operationType: 'min',
              sourceField: 'bytes',
              params: { format: { id: 'bytes' } },
              // Other parts of this don't matter for this test
            }),
          },
        },
      },
    });
  });

  it('should not set the state if selecting the currently active operation', () => {
    wrapper = mount(<IndexPatternDimensionEditorComponent {...defaultProps} />);

    act(() => {
      wrapper
        .find('button[data-test-subj="lns-indexPatternDimension-date_histogram"]')
        .simulate('click');
    });

    expect(setState).not.toHaveBeenCalled();
  });

  it('should update label and custom label flag on label input changes', () => {
    wrapper = mount(<IndexPatternDimensionEditorComponent {...defaultProps} />);

    act(() => {
      wrapper
        .find('input[data-test-subj="indexPattern-label-edit"]')
        .simulate('change', { target: { value: 'New Label' } });
    });

    expect(setState.mock.calls[0]).toEqual([expect.any(Function)]);
    expect(setState.mock.calls[0][0](state)).toEqual({
      ...state,
      layers: {
        first: {
          ...state.layers.first,
          columns: {
            ...state.layers.first.columns,
            col1: expect.objectContaining({
              label: 'New Label',
              customLabel: true,
              // Other parts of this don't matter for this test
            }),
          },
        },
      },
    });
  });

  it('should not keep the label as long as it is the default label', () => {
    wrapper = mount(
      <IndexPatternDimensionEditorComponent
        {...defaultProps}
        state={getStateWithColumns({ col1: bytesColumn })}
      />
    );

    act(() => {
      wrapper.find('button[data-test-subj="lns-indexPatternDimension-min"]').simulate('click');
    });

    expect(setState.mock.calls[0]).toEqual([expect.any(Function), { isDimensionComplete: true }]);
    expect(setState.mock.calls[0][0](state)).toEqual({
      ...state,
      layers: {
        first: {
          ...state.layers.first,
          columns: {
            ...state.layers.first.columns,
            col1: expect.objectContaining({
              label: 'Minimum of bytes',
            }),
          },
        },
      },
    });
  });

  it('should keep the label on operation change if it is custom', () => {
    wrapper = mount(
      <IndexPatternDimensionEditorComponent
        {...defaultProps}
        state={getStateWithColumns({
          col1: {
            ...bytesColumn,
            label: 'Custom label',
            customLabel: true,
          },
        })}
      />
    );

    act(() => {
      wrapper.find('button[data-test-subj="lns-indexPatternDimension-min"]').simulate('click');
    });

    expect(setState.mock.calls[0]).toEqual([expect.any(Function), { isDimensionComplete: true }]);
    expect(setState.mock.calls[0][0](state)).toEqual({
      ...state,
      layers: {
        first: {
          ...state.layers.first,
          columns: {
            ...state.layers.first.columns,
            col1: expect.objectContaining({
              label: 'Custom label',
              customLabel: true,
            }),
          },
        },
      },
    });
  });

  it('should remove customLabel flag if label is set to default', () => {
    wrapper = mount(
      <IndexPatternDimensionEditorComponent
        {...defaultProps}
        state={getStateWithColumns({
          col1: {
            ...bytesColumn,
            label: 'Custom label',
            customLabel: true,
          },
        })}
      />
    );

    act(() => {
      wrapper
        .find('input[data-test-subj="indexPattern-label-edit"]')
        .simulate('change', { target: { value: 'Sum of bytes' } });
    });

    expect(setState.mock.calls[0]).toEqual([expect.any(Function)]);
    expect(setState.mock.calls[0][0](state)).toEqual({
      ...state,
      layers: {
        first: {
          ...state.layers.first,
          columns: {
            ...state.layers.first.columns,
            col1: expect.objectContaining({
              label: 'Sum of bytes',
              customLabel: false,
              // Other parts of this don't matter for this test
            }),
          },
        },
      },
    });
  });

  describe('transient invalid state', () => {
    it('should set the state if selecting an operation incompatible with the current field', () => {
      wrapper = mount(<IndexPatternDimensionEditorComponent {...defaultProps} />);

      act(() => {
        wrapper
          .find('button[data-test-subj="lns-indexPatternDimension-terms incompatible"]')
          .simulate('click');
      });

      expect(setState.mock.calls[0]).toEqual([expect.any(Function), { isDimensionComplete: true }]);
      expect(setState.mock.calls[0][0](state)).toEqual({
        ...state,
        layers: {
          first: {
            ...state.layers.first,
            columns: {
              ...state.layers.first.columns,
            },
            incompleteColumns: {
              col1: { operationType: 'terms' },
            },
          },
        },
      });
    });

    it('should show error message in invalid state', () => {
      wrapper = mount(<IndexPatternDimensionEditorComponent {...defaultProps} />);

      wrapper
        .find('button[data-test-subj="lns-indexPatternDimension-terms incompatible"]')
        .simulate('click');

      expect(
        wrapper.find('[data-test-subj="indexPattern-field-selection-row"]').first().prop('error')
      ).toBeDefined();
    });

    it('should leave error state if a compatible operation is selected', () => {
      wrapper = mount(<IndexPatternDimensionEditorComponent {...defaultProps} />);

      wrapper
        .find('button[data-test-subj="lns-indexPatternDimension-terms incompatible"]')
        .simulate('click');

      wrapper
        .find('button[data-test-subj="lns-indexPatternDimension-date_histogram"]')
        .simulate('click');

      expect(wrapper.find('[data-test-subj="indexPattern-invalid-operation"]')).toHaveLength(0);
    });

    it('should leave error state if the original operation is re-selected', () => {
      wrapper = mount(<IndexPatternDimensionEditorComponent {...defaultProps} />);

      wrapper
        .find('button[data-test-subj="lns-indexPatternDimension-terms incompatible"]')
        .simulate('click');

      wrapper
        .find('button[data-test-subj="lns-indexPatternDimension-date_histogram"]')
        .simulate('click');

      expect(wrapper.find('[data-test-subj="indexPattern-invalid-operation"]')).toHaveLength(0);
    });

    it('should leave error state when switching from incomplete state to fieldless operation', () => {
      // @ts-expect-error
      window['__react-beautiful-dnd-disable-dev-warnings'] = true; // issue with enzyme & react-beautiful-dnd throwing errors: https://github.com/atlassian/react-beautiful-dnd/issues/1593
      wrapper = mount(<IndexPatternDimensionEditorComponent {...defaultProps} />);

      wrapper
        .find('button[data-test-subj="lns-indexPatternDimension-terms incompatible"]')
        .simulate('click');

      wrapper.find('button[data-test-subj="lns-indexPatternDimension-filters"]').simulate('click');

      expect(wrapper.find('[data-test-subj="indexPattern-invalid-operation"]')).toHaveLength(0);
    });

    it('should leave error state when re-selecting the original fieldless function', () => {
      wrapper = mount(
        <IndexPatternDimensionEditorComponent
          {...defaultProps}
          state={getStateWithColumns({
            col1: {
              label: 'Filter',
              dataType: 'string',
              isBucketed: true,
              // Private
              operationType: 'filters',
              params: { filters: [] },
            } as FiltersIndexPatternColumn,
          })}
        />
      );

      wrapper
        .find('button[data-test-subj="lns-indexPatternDimension-terms incompatible"]')
        .simulate('click');

      wrapper.find('button[data-test-subj="lns-indexPatternDimension-filters"]').simulate('click');

      expect(wrapper.find('[data-test-subj="indexPattern-invalid-operation"]')).toHaveLength(0);
    });

    it('should indicate fields compatible with selected operation', () => {
      wrapper = mount(<IndexPatternDimensionEditorComponent {...defaultProps} />);

      wrapper
        .find('button[data-test-subj="lns-indexPatternDimension-terms incompatible"]')
        .simulate('click');

      const options = wrapper
        .find(EuiComboBox)
        .filter('[data-test-subj="indexPattern-dimension-field"]')
        .prop('options');

      expect(options![0]['data-test-subj']).toContain('Incompatible');

      expect(
        options![1].options!.filter(({ label }) => label === 'timestampLabel')[0]['data-test-subj']
      ).toContain('Incompatible');
      expect(
        options![1].options!.filter(({ label }) => label === 'source')[0]['data-test-subj']
      ).not.toContain('Incompatible');
    });

    it('should select compatible operation if field not compatible with selected operation', () => {
      wrapper = mount(<IndexPatternDimensionEditorComponent {...defaultProps} columnId={'col2'} />);

      wrapper.find('button[data-test-subj="lns-indexPatternDimension-average"]').simulate('click');

      expect(setState.mock.calls[0]).toEqual([
        expect.any(Function),
        { isDimensionComplete: false },
      ]);
      expect(setState.mock.calls[0][0](state)).toEqual({
        ...state,
        layers: {
          first: {
            ...state.layers.first,
            incompleteColumns: {
              col2: { operationType: 'average' },
            },
          },
        },
      });

      const comboBox = wrapper
        .find(EuiComboBox)
        .filter('[data-test-subj="indexPattern-dimension-field"]');
      const options = comboBox.prop('options');

      // options[1][2] is a `source` field of type `string` which doesn't support `average` operation
      act(() => {
        comboBox.prop('onChange')!([options![1].options![2]]);
      });

      expect(setState.mock.calls[1][0](state)).toEqual({
        ...state,
        layers: {
          first: {
            ...state.layers.first,
            columns: {
              ...state.layers.first.columns,
              col2: expect.objectContaining({
                sourceField: 'source',
                operationType: 'terms',
                // Other parts of this don't matter for this test
              }),
            },
            columnOrder: ['col2', 'col1'],
          },
        },
      });
    });

    it('should keep current state and write incomplete column when transitioning from incomplete reference-based operations to field operation', () => {
      const baseState = getStateWithColumns({
        ...defaultProps.state.layers.first.columns,
        col2: {
          label: 'Counter rate',
          dataType: 'number',
          isBucketed: false,
          operationType: 'counter_rate',
          references: ['ref'],
        },
      });
      wrapper = mount(
        <IndexPatternDimensionEditorComponent
          {...defaultProps}
          state={baseState}
          columnId={'col2'}
        />
      );

      // Transition to a field operation (incompatible)
      wrapper
        .find('button[data-test-subj="lns-indexPatternDimension-average incompatible"]')
        .simulate('click');

      // Now check that the dimension gets cleaned up on state update
      expect(setState.mock.calls[0]).toEqual([expect.any(Function), { isDimensionComplete: true }]);
      expect(setState.mock.calls[0][0](state)).toEqual({
        ...baseState,
        layers: {
          first: {
            ...baseState.layers.first,
            incompleteColumns: {
              col2: { operationType: 'average' },
            },
          },
        },
      });
    });

    it('should select the Records field when count is selected', () => {
      wrapper = mount(
        <IndexPatternDimensionEditorComponent
          {...defaultProps}
          state={getStateWithColumns({
            col2: {
              dataType: 'number',
              isBucketed: false,
              label: '',
              operationType: 'average',
              sourceField: 'bytes',
            },
          })}
          columnId="col2"
        />
      );

      wrapper
        .find('button[data-test-subj="lns-indexPatternDimension-count incompatible"]')
        .simulate('click');

      const newColumnState = setState.mock.calls[0][0](state).layers.first.columns.col2;
      expect(newColumnState.operationType).toEqual('count');
      expect(newColumnState.sourceField).toEqual('___records___');
    });

    it('should indicate document and field compatibility with selected document operation', () => {
      wrapper = mount(
        <IndexPatternDimensionEditorComponent
          {...defaultProps}
          state={getStateWithColumns({
            col2: {
              dataType: 'number',
              isBucketed: false,
              label: '',
              operationType: 'count',
              sourceField: '___records___',
            },
          })}
          columnId="col2"
        />
      );

      wrapper
        .find('button[data-test-subj="lns-indexPatternDimension-terms incompatible"]')
        .simulate('click');

      const options = wrapper
        .find(EuiComboBox)
        .filter('[data-test-subj="indexPattern-dimension-field"]')
        .prop('options');

      expect(options![0]['data-test-subj']).toContain('Incompatible');

      expect(
        options![1].options!.filter(({ label }) => label === 'timestampLabel')[0]['data-test-subj']
      ).toContain('Incompatible');
      expect(
        options![1].options!.filter(({ label }) => label === 'source')[0]['data-test-subj']
      ).not.toContain('Incompatible');
    });

    it('should set datasource state if compatible field is selected for operation', () => {
      wrapper = mount(<IndexPatternDimensionEditorComponent {...defaultProps} />);

      wrapper
        .find('button[data-test-subj="lns-indexPatternDimension-terms incompatible"]')
        .simulate('click');

      const comboBox = wrapper
        .find(EuiComboBox)
        .filter('[data-test-subj="indexPattern-dimension-field"]')!;
      const option = comboBox.prop('options')![1].options!.find(({ label }) => label === 'source')!;

      act(() => {
        comboBox.prop('onChange')!([option]);
      });

      expect(setState.mock.calls.length).toEqual(2);
      expect(setState.mock.calls[1]).toEqual([
        expect.any(Function),
        { isDimensionComplete: true, forceRender: false },
      ]);
      expect(setState.mock.calls[1][0](state)).toEqual({
        ...state,
        layers: {
          first: {
            ...state.layers.first,
            columns: {
              ...state.layers.first.columns,
              col1: expect.objectContaining({
                sourceField: 'source',
                operationType: 'terms',
              }),
            },
          },
        },
      });
    });
  });

  describe('time scaling', () => {
    function getProps(colOverrides: Partial<GenericIndexPatternColumn>) {
      return {
        ...defaultProps,
        state: getStateWithColumns({
          datecolumn: {
            dataType: 'date',
            isBucketed: true,
            label: '',
            customLabel: true,
            operationType: 'date_histogram',
            sourceField: 'ts',
            params: {
              interval: '1d',
            },
          } as DateHistogramIndexPatternColumn,
          col2: {
            dataType: 'number',
            isBucketed: false,
            label: 'Count of records',
            operationType: 'count',
            sourceField: '___records___',
            ...colOverrides,
          } as GenericIndexPatternColumn,
        }),
        columnId: 'col2',
      };
    }

    it('should not show custom options if time scaling is not available', () => {
      wrapper = mount(
        <IndexPatternDimensionEditorComponent
          {...getProps({
            operationType: 'average',
            sourceField: 'bytes',
          })}
        />
      );
      wrapper
        .find('[data-test-subj="indexPattern-advanced-popover"]')
        .hostNodes()
        .simulate('click');
      expect(
        wrapper.find('[data-test-subj="indexPattern-time-scaling-enable"]').hostNodes()
      ).toHaveLength(0);
    });

    it('should show custom options if time scaling is available', () => {
      wrapper = mount(<IndexPatternDimensionEditorComponent {...getProps({})} />);
      wrapper
        .find('[data-test-subj="indexPattern-advanced-popover"]')
        .hostNodes()
        .simulate('click');
      expect(
        wrapper.find('[data-test-subj="indexPattern-time-scaling-enable"]').hostNodes()
      ).toHaveLength(1);
    });

    it('should show current time scaling if set', () => {
      wrapper = mount(<IndexPatternDimensionEditorComponent {...getProps({ timeScale: 'd' })} />);
      expect(
        wrapper
          .find('[data-test-subj="indexPattern-time-scaling-unit"]')
          .find(EuiSelect)
          .prop('value')
      ).toEqual('d');
    });

    it('should allow to set time scaling initially', () => {
      const props = getProps({});
      wrapper = mount(<IndexPatternDimensionEditorComponent {...props} />);
      wrapper
        .find('[data-test-subj="indexPattern-advanced-popover"]')
        .hostNodes()
        .simulate('click');
      wrapper
        .find('[data-test-subj="indexPattern-time-scaling-enable"]')
        .hostNodes()
        .simulate('click');
      expect(setState.mock.calls[0]).toEqual([expect.any(Function), { isDimensionComplete: true }]);
      expect(setState.mock.calls[0][0](props.state)).toEqual({
        ...props.state,
        layers: {
          first: {
            ...props.state.layers.first,
            columns: {
              ...props.state.layers.first.columns,
              col2: expect.objectContaining({
                timeScale: 's',
                label: 'Count of records per second',
              }),
            },
          },
        },
      });
    });

    it('should carry over time scaling to other operation if possible', () => {
      const props = getProps({
        timeScale: 'h',
        sourceField: 'bytes',
        operationType: 'sum',
        label: 'Sum of bytes per hour',
      });
      wrapper = mount(<IndexPatternDimensionEditorComponent {...props} />);
      wrapper
        .find('button[data-test-subj="lns-indexPatternDimension-count incompatible"]')
        .simulate('click');
      expect(setState.mock.calls[0]).toEqual([expect.any(Function), { isDimensionComplete: true }]);
      expect(setState.mock.calls[0][0](props.state)).toEqual({
        ...props.state,
        layers: {
          first: {
            ...props.state.layers.first,
            columns: {
              ...props.state.layers.first.columns,
              col2: expect.objectContaining({
                timeScale: 'h',
                label: 'Count of records per hour',
              }),
            },
          },
        },
      });
    });

    it('should not carry over time scaling if the other operation does not support it', () => {
      const props = getProps({
        timeScale: 'h',
        sourceField: 'bytes',
        operationType: 'sum',
        label: 'Sum of bytes per hour',
      });
      wrapper = mount(<IndexPatternDimensionEditorComponent {...props} />);
      wrapper.find('button[data-test-subj="lns-indexPatternDimension-average"]').simulate('click');
      expect(setState.mock.calls[0]).toEqual([expect.any(Function), { isDimensionComplete: true }]);
      expect(setState.mock.calls[0][0](props.state)).toEqual({
        ...props.state,
        layers: {
          first: {
            ...props.state.layers.first,
            columns: {
              ...props.state.layers.first.columns,
              col2: expect.objectContaining({
                timeScale: undefined,
                label: 'Average of bytes',
              }),
            },
          },
        },
      });
    });

    it('should allow to change time scaling', () => {
      const props = getProps({ timeScale: 's', label: 'Count of records per second' });
      wrapper = mount(<IndexPatternDimensionEditorComponent {...props} />);
      wrapper
        .find('button[data-test-subj="indexPattern-advanced-popover"]')
        .hostNodes()
        .simulate('click');

      wrapper.find('[data-test-subj="indexPattern-time-scaling-unit"] select').simulate('change', {
        target: { value: 'h' },
      });

      expect(setState.mock.calls[0]).toEqual([expect.any(Function), { isDimensionComplete: true }]);
      expect(setState.mock.calls[0][0](props.state)).toEqual({
        ...props.state,
        layers: {
          first: {
            ...props.state.layers.first,
            columns: {
              ...props.state.layers.first.columns,
              col2: expect.objectContaining({
                timeScale: 'h',
                label: 'Count of records per hour',
              }),
            },
          },
        },
      });
    });

    it('should not adjust label if it is custom', () => {
      const props = getProps({ timeScale: 's', customLabel: true, label: 'My label' });
      wrapper = mount(<IndexPatternDimensionEditorComponent {...props} />);
      wrapper.find('[data-test-subj="indexPattern-time-scaling-unit"] select').simulate('change', {
        target: { value: 'h' },
      });
      expect(setState.mock.calls[0]).toEqual([expect.any(Function), { isDimensionComplete: true }]);
      expect(setState.mock.calls[0][0](props.state)).toEqual({
        ...props.state,
        layers: {
          first: {
            ...props.state.layers.first,
            columns: {
              ...props.state.layers.first.columns,
              col2: expect.objectContaining({
                timeScale: 'h',
                label: 'My label',
              }),
            },
          },
        },
      });
    });

    it('should allow to remove time scaling', () => {
      const props = getProps({ timeScale: 's', label: 'Count of records per second' });
      wrapper = mount(<IndexPatternDimensionEditorComponent {...props} />);
      wrapper.find('[data-test-subj="indexPattern-time-scaling-remove"] button').simulate('click');
      expect(setState.mock.calls[0]).toEqual([expect.any(Function), { isDimensionComplete: true }]);
      expect(setState.mock.calls[0][0](props.state)).toEqual({
        ...props.state,
        layers: {
          first: {
            ...props.state.layers.first,
            columns: {
              ...props.state.layers.first.columns,
              col2: expect.objectContaining({
                timeScale: undefined,
                label: 'Count of records',
              }),
            },
          },
        },
      });
    });
  });

  describe('time shift', () => {
    function getProps(colOverrides: Partial<GenericIndexPatternColumn>) {
      return {
        ...defaultProps,
        state: getStateWithColumns({
          datecolumn: {
            dataType: 'date',
            isBucketed: true,
            label: '',
            customLabel: true,
            operationType: 'date_histogram',
            sourceField: 'ts',
            params: {
              interval: '1d',
            },
          } as DateHistogramIndexPatternColumn,
          col2: {
            dataType: 'number',
            isBucketed: false,
            label: 'Count of records',
            operationType: 'count',
            sourceField: '___records___',
            ...colOverrides,
          } as GenericIndexPatternColumn,
        }),
        columnId: 'col2',
      };
    }

    it('should not show custom options if time shift is not available', () => {
      const props = {
        ...defaultProps,
        state: getStateWithColumns({
          col2: {
            dataType: 'number',
            isBucketed: false,
            label: 'Count of records',
            operationType: 'count',
            sourceField: '___records___',
          } as GenericIndexPatternColumn,
        }),
        columnId: 'col2',
      };
      wrapper = shallow(
        <IndexPatternDimensionEditorComponent
          {...props}
          state={{
            ...props.state,
            indexPatterns: {
              '1': {
                ...props.state.indexPatterns['1'],
                timeFieldName: undefined,
              },
            },
          }}
        />
      );
      expect(
        wrapper
          .find(DimensionEditor)
          .dive()
          .find(AdvancedOptions)
          .dive()
          .find('[data-test-subj="indexPattern-time-shift-enable"]')
      ).toHaveLength(0);
    });

    it('should show custom options if time shift is available', () => {
      wrapper = shallow(<IndexPatternDimensionEditorComponent {...getProps({})} />);
      expect(
        wrapper
          .find(DimensionEditor)
          .dive()
          .find(AdvancedOptions)
          .dive()
          .find('[data-test-subj="indexPattern-time-shift-enable"]')
      ).toHaveLength(1);
    });

    it('should show current time shift if set', () => {
      wrapper = mount(<IndexPatternDimensionEditorComponent {...getProps({ timeShift: '1d' })} />);
      expect(wrapper.find(TimeShift).find(EuiComboBox).prop('selectedOptions')[0].value).toEqual(
        '1d'
      );
    });

    it('should allow to set time shift initially', () => {
      const props = getProps({});
      wrapper = shallow(<IndexPatternDimensionEditorComponent {...props} />);
      wrapper
        .find(DimensionEditor)
        .dive()
        .find(AdvancedOptions)
        .dive()
        .find('[data-test-subj="indexPattern-time-shift-enable"]')
        .simulate('click');
      expect((props.setState as jest.Mock).mock.calls[0][0](props.state)).toEqual({
        ...props.state,
        layers: {
          first: {
            ...props.state.layers.first,
            columns: {
              ...props.state.layers.first.columns,
              col2: expect.objectContaining({
                timeShift: '',
              }),
            },
          },
        },
      });
    });

    it('should carry over time shift to other operation if possible', () => {
      const props = getProps({
        timeShift: '1d',
        sourceField: 'bytes',
        operationType: 'sum',
        label: 'Sum of bytes per hour',
      });
      wrapper = mount(<IndexPatternDimensionEditorComponent {...props} />);
      wrapper
        .find('button[data-test-subj="lns-indexPatternDimension-count incompatible"]')
        .simulate('click');
      expect((props.setState as jest.Mock).mock.calls[0][0](props.state)).toEqual({
        ...props.state,
        layers: {
          first: {
            ...props.state.layers.first,
            columns: {
              ...props.state.layers.first.columns,
              col2: expect.objectContaining({
                timeShift: '1d',
              }),
            },
          },
        },
      });
    });

    it('should allow to change time shift', () => {
      const props = getProps({
        timeShift: '1d',
      });
      wrapper = mount(<IndexPatternDimensionEditorComponent {...props} />);
      wrapper.find(TimeShift).find(EuiComboBox).prop('onCreateOption')!('1h', []);
      expect((props.setState as jest.Mock).mock.calls[0][0](props.state)).toEqual({
        ...props.state,
        layers: {
          first: {
            ...props.state.layers.first,
            columns: {
              ...props.state.layers.first.columns,
              col2: expect.objectContaining({
                timeShift: '1h',
              }),
            },
          },
        },
      });
    });

    it('should allow to time shift', () => {
      const props = getProps({
        timeShift: '1h',
      });
      wrapper = mount(<IndexPatternDimensionEditorComponent {...props} />);
      wrapper
        .find('[data-test-subj="indexPattern-time-shift-remove"]')
        .find(EuiButtonIcon)
        .simulate('click');
      expect((props.setState as jest.Mock).mock.calls[0][0](props.state)).toEqual({
        ...props.state,
        layers: {
          first: {
            ...props.state.layers.first,
            columns: {
              ...props.state.layers.first.columns,
              col2: expect.objectContaining({
                timeShift: undefined,
              }),
            },
          },
        },
      });
    });

    it('should report a generic error for invalid shift string', () => {
      const props = getProps({
        timeShift: '5 months',
      });
      wrapper = mount(<IndexPatternDimensionEditorComponent {...props} />);

      expect(wrapper.find(TimeShift).find(EuiComboBox).prop('isInvalid')).toBeTruthy();

      expect(
        wrapper
          .find(TimeShift)
          .find('[data-test-subj="indexPattern-dimension-time-shift-row"]')
          .first()
          .prop('error')
      ).toBe('Time shift value is not valid.');
    });
  });

  describe('filtering', () => {
    function getProps(colOverrides: Partial<GenericIndexPatternColumn>) {
      return {
        ...defaultProps,
        state: getStateWithColumns({
          datecolumn: {
            dataType: 'date',
            isBucketed: true,
            label: '',
            customLabel: true,
            operationType: 'date_histogram',
            sourceField: 'ts',
            params: {
              interval: '1d',
            },
          } as DateHistogramIndexPatternColumn,
          col2: {
            dataType: 'number',
            isBucketed: false,
            label: 'Count of records',
            operationType: 'count',
            sourceField: '___records___',
            ...colOverrides,
          } as GenericIndexPatternColumn,
        }),
        columnId: 'col2',
      };
    }

    it('should not show custom options if time scaling is not available', () => {
      wrapper = mount(
        <IndexPatternDimensionEditorComponent
          {...getProps({
            operationType: 'terms',
            sourceField: 'bytes',
            params: {
              orderDirection: 'asc',
              orderBy: { type: 'alphabetical' },
              size: 5,
            },
          } as TermsIndexPatternColumn)}
        />
      );
      expect(
        wrapper.find('[data-test-subj="indexPattern-advanced-popover"]').hostNodes()
      ).toHaveLength(0);
    });

    it('should show custom options if filtering is available', () => {
      wrapper = mount(<IndexPatternDimensionEditorComponent {...getProps({})} />);
      wrapper
        .find('[data-test-subj="indexPattern-advanced-popover"]')
        .hostNodes()
        .simulate('click');
      expect(
        wrapper.find('[data-test-subj="indexPattern-filter-by-enable"]').hostNodes()
      ).toHaveLength(1);
    });

    it('should show current filter if set', () => {
      wrapper = mount(
        <IndexPatternDimensionEditorComponent
          {...getProps({ filter: { language: 'kuery', query: 'a: b' } })}
        />
      );

      expect(
        wrapper
          .find(Filtering)
          .find('button[data-test-subj="indexPattern-filters-existingFilterTrigger"]')
          .text()
      ).toBe(`a: b`);
    });

    it('should allow to set filter initially', () => {
      const props = getProps({});
      wrapper = mount(<IndexPatternDimensionEditorComponent {...props} />);
      wrapper
        .find('[data-test-subj="indexPattern-advanced-popover"]')
        .hostNodes()
        .simulate('click');
      wrapper
        .find('[data-test-subj="indexPattern-filter-by-enable"]')
        .hostNodes()
        .simulate('click');
      expect(setState.mock.calls[0]).toEqual([expect.any(Function), { isDimensionComplete: true }]);
      expect(setState.mock.calls[0][0](props.state)).toEqual({
        ...props.state,
        layers: {
          first: {
            ...props.state.layers.first,
            columns: {
              ...props.state.layers.first.columns,
              col2: expect.objectContaining({
                filter: {
                  language: 'kuery',
                  query: '',
                },
              }),
            },
          },
        },
      });
    });

    it('should carry over filter to other operation if possible', () => {
      const props = getProps({
        filter: { language: 'kuery', query: 'a: b' },
        sourceField: 'bytes',
        operationType: 'sum',
        label: 'Sum of bytes per hour',
      });
      wrapper = mount(<IndexPatternDimensionEditorComponent {...props} />);
      wrapper
        .find('button[data-test-subj="lns-indexPatternDimension-count incompatible"]')
        .simulate('click');
      expect(setState.mock.calls[0]).toEqual([expect.any(Function), { isDimensionComplete: true }]);
      expect(setState.mock.calls[0][0](props.state)).toEqual({
        ...props.state,
        layers: {
          first: {
            ...props.state.layers.first,
            columns: {
              ...props.state.layers.first.columns,
              col2: expect.objectContaining({
                filter: { language: 'kuery', query: 'a: b' },
              }),
            },
          },
        },
      });
    });

    it('should allow to change filter', () => {
      const props = getProps({
        filter: { language: 'kuery', query: 'a: b' },
      });

      wrapper = mount(<IndexPatternDimensionEditorComponent {...props} />);

      act(() => {
        const { updateLayer, columnId, layer } = wrapper.find(Filtering).props();

        updateLayer(setFilter(columnId, layer, { language: 'kuery', query: 'c: d' }));
      });

      expect(setState.mock.calls[0]).toEqual([expect.any(Function), { isDimensionComplete: true }]);
      expect(setState.mock.calls[0][0](props.state)).toEqual({
        ...props.state,
        layers: {
          first: {
            ...props.state.layers.first,
            columns: {
              ...props.state.layers.first.columns,
              col2: expect.objectContaining({
                filter: { language: 'kuery', query: 'c: d' },
              }),
            },
          },
        },
      });
    });

    it('should allow to remove filter', () => {
      const props = getProps({
        filter: { language: 'kuery', query: 'a: b' },
      });
      wrapper = mount(<IndexPatternDimensionEditorComponent {...props} />);
      wrapper
        .find('[data-test-subj="indexPattern-filter-by-remove"]')
        .find(EuiButtonIcon)
        .simulate('click');

      expect(setState.mock.calls[0]).toEqual([expect.any(Function), { isDimensionComplete: true }]);
      expect(setState.mock.calls[0][0](props.state)).toEqual({
        ...props.state,
        layers: {
          first: {
            ...props.state.layers.first,
            columns: {
              ...props.state.layers.first.columns,
              col2: expect.objectContaining({
                filter: undefined,
              }),
            },
          },
        },
      });
    });
  });

  it('should render invalid field if field reference is broken', () => {
    wrapper = mount(
      <IndexPatternDimensionEditorComponent
        {...defaultProps}
        state={{
          ...defaultProps.state,
          layers: {
            first: {
              ...defaultProps.state.layers.first,
              columns: {
                col1: {
                  ...defaultProps.state.layers.first.columns.col1,
                  sourceField: 'nonexistent',
                } as DateHistogramIndexPatternColumn,
              },
            },
          },
        }}
      />
    );

    expect(wrapper.find(EuiComboBox).prop('selectedOptions')).toEqual([
      {
        label: 'nonexistent',
        value: { type: 'field', field: 'nonexistent' },
      },
    ]);
  });

  it('should support selecting the operation before the field', () => {
    wrapper = mount(<IndexPatternDimensionEditorComponent {...defaultProps} columnId={'col2'} />);

    wrapper.find('button[data-test-subj="lns-indexPatternDimension-average"]').simulate('click');

    expect(setState.mock.calls[0]).toEqual([expect.any(Function), { isDimensionComplete: false }]);
    expect(setState.mock.calls[0][0](defaultProps.state)).toEqual({
      ...state,
      layers: {
        first: {
          ...state.layers.first,
          incompleteColumns: {
            col2: {
              operationType: 'average',
            },
          },
        },
      },
    });

    const comboBox = wrapper
      .find(EuiComboBox)
      .filter('[data-test-subj="indexPattern-dimension-field"]');
    const options = comboBox.prop('options');

    act(() => {
      comboBox.prop('onChange')!([options![1].options![0]]);
    });

    expect(setState.mock.calls[1][0](defaultProps.state)).toEqual({
      ...state,
      layers: {
        first: {
          ...state.layers.first,
          columnOrder: ['col1', 'col2'],
          columns: {
            ...state.layers.first.columns,
            col2: expect.objectContaining({
              operationType: 'average',
              sourceField: 'bytes',
            }),
          },
          incompleteColumns: {},
        },
      },
    });
  });

  it('should select operation directly if only one field is possible', () => {
    const initialState = {
      ...state,
      indexPatterns: {
        1: {
          ...state.indexPatterns['1'],
          fields: state.indexPatterns['1'].fields.filter((field) => field.name !== 'memory'),
        },
      },
    };

    wrapper = mount(
      <IndexPatternDimensionEditorComponent
        {...defaultProps}
        state={initialState}
        columnId={'col2'}
      />
    );

    wrapper.find('button[data-test-subj="lns-indexPatternDimension-average"]').simulate('click');

    expect(setState.mock.calls[0]).toEqual([expect.any(Function), { isDimensionComplete: true }]);
    expect(setState.mock.calls[0][0](initialState)).toEqual({
      ...initialState,
      layers: {
        first: {
          ...initialState.layers.first,
          columns: {
            ...initialState.layers.first.columns,
            col2: expect.objectContaining({
              sourceField: 'bytes',
              operationType: 'average',
              // Other parts of this don't matter for this test
            }),
          },
          columnOrder: ['col1', 'col2'],
        },
      },
    });
  });

  it('should select operation directly if only document is possible', () => {
    wrapper = mount(<IndexPatternDimensionEditorComponent {...defaultProps} columnId={'col2'} />);

    wrapper.find('button[data-test-subj="lns-indexPatternDimension-count"]').simulate('click');

    expect(setState.mock.calls[0]).toEqual([expect.any(Function), { isDimensionComplete: true }]);
    expect(setState.mock.calls[0][0](state)).toEqual({
      ...state,
      layers: {
        first: {
          ...state.layers.first,
          columns: {
            ...state.layers.first.columns,
            col2: expect.objectContaining({
              operationType: 'count',
              // Other parts of this don't matter for this test
            }),
          },
          columnOrder: ['col1', 'col2'],
        },
      },
    });
  });

  it('should indicate compatible fields when selecting the operation first', () => {
    wrapper = mount(<IndexPatternDimensionEditorComponent {...defaultProps} columnId={'col2'} />);

    act(() => {
      wrapper.find('button[data-test-subj="lns-indexPatternDimension-average"]').simulate('click');
    });

    const options = wrapper
      .find(EuiComboBox)
      .filter('[data-test-subj="indexPattern-dimension-field"]')
      .prop('options');

    expect(options![0]['data-test-subj']).toContain('Incompatible');

    expect(
      options![1].options!.filter(({ label }) => label === 'timestampLabel')[0]['data-test-subj']
    ).toContain('Incompatible');
    expect(
      options![1].options!.filter(({ label }) => label === 'bytes')[0]['data-test-subj']
    ).not.toContain('Incompatible');
    expect(
      options![1].options!.filter(({ label }) => label === 'memory')[0]['data-test-subj']
    ).not.toContain('Incompatible');
  });

  it('should indicate document compatibility when document operation is selected', () => {
    wrapper = mount(
      <IndexPatternDimensionEditorComponent
        {...defaultProps}
        state={getStateWithColumns({
          col2: {
            dataType: 'number',
            isBucketed: false,
            label: '',
            operationType: 'count',
            sourceField: '___records___',
          },
        })}
        columnId={'col2'}
      />
    );

    const options = wrapper
      .find(EuiComboBox)
      .filter('[data-test-subj="indexPattern-dimension-field"]')
      .prop('options');

    expect(options![0]['data-test-subj']).not.toContain('Incompatible');

    options![1].options!.map((operation) =>
      expect(operation['data-test-subj']).toContain('Incompatible')
    );
  });

  it('should not update when selecting the current field again', () => {
    wrapper = mount(<IndexPatternDimensionEditorComponent {...defaultProps} />);

    const comboBox = wrapper
      .find(EuiComboBox)
      .filter('[data-test-subj="indexPattern-dimension-field"]');

    const option = comboBox
      .prop('options')![1]
      .options!.find(({ label }) => label === 'timestampLabel')!;

    act(() => {
      comboBox.prop('onChange')!([option]);
    });

    expect(setState).not.toHaveBeenCalled();
  });

  it('should show all operations that are not filtered out', () => {
    wrapper = mount(
      <IndexPatternDimensionEditorComponent
        {...defaultProps}
        filterOperations={(op: OperationMetadata) => !op.isBucketed && op.dataType === 'number'}
      />
    );

    const items: EuiListGroupItemProps[] = wrapper.find(EuiListGroup).prop('listItems') || [];

    expect(items.map(({ label }: { label: React.ReactNode }) => label)).toEqual([
      'Average',
      'Count',
      'Counter rate',
      'Cumulative sum',
      'Differences',
      'Last value',
      'Maximum',
      'Median',
      'Minimum',
      'Moving average',
      'Percentile',
      'Sum',
      'Unique count',
      '\u00a0',
    ]);
  });

  it('should add a column on selection of a field', () => {
    // Prevents field format from being loaded
    setState.mockImplementation(() => {});

    wrapper = mount(<IndexPatternDimensionEditorComponent {...defaultProps} columnId={'col2'} />);

    const comboBox = wrapper
      .find(EuiComboBox)
      .filter('[data-test-subj="indexPattern-dimension-field"]')!;
    const option = comboBox.prop('options')![1].options![0];

    act(() => {
      comboBox.prop('onChange')!([option]);
    });

    expect(setState.mock.calls[0]).toEqual([
      expect.any(Function),
      { isDimensionComplete: true, forceRender: false },
    ]);
    expect(setState.mock.calls[0][0](defaultProps.state)).toEqual({
      ...state,
      layers: {
        first: {
          ...state.layers.first,
          columns: {
            ...state.layers.first.columns,
            col2: expect.objectContaining({
              operationType: 'range',
              sourceField: 'bytes',
              // Other parts of this don't matter for this test
            }),
          },
          columnOrder: ['col1', 'col2'],
        },
      },
    });
  });

  it('should use helper function when changing the function', () => {
    const initialState: IndexPatternPrivateState = getStateWithColumns({
      col1: bytesColumn,
    });
    wrapper = mount(
      <IndexPatternDimensionEditorComponent {...defaultProps} state={initialState} />
    );
    act(() => {
      wrapper
        .find('button[data-test-subj="lns-indexPatternDimension-min"]')
        .first()
        .simulate('click');
    });

    expect(replaceColumn).toHaveBeenCalledWith(
      expect.objectContaining({
        columnId: 'col1',
        op: 'min',
        field: expect.objectContaining({ name: 'bytes' }),
      })
    );
  });

  it('should keep the latest valid dimension when removing the selection in field combobox', () => {
    wrapper = mount(<IndexPatternDimensionEditorComponent {...defaultProps} />);

    act(() => {
      wrapper
        .find(EuiComboBox)
        .filter('[data-test-subj="indexPattern-dimension-field"]')
        .prop('onChange')!([]);
    });

    expect(setState).not.toHaveBeenCalled();
  });

  it('allows custom format', () => {
    const stateWithNumberCol: IndexPatternPrivateState = getStateWithColumns({
      col1: {
        label: 'Average of memory',
        dataType: 'number',
        isBucketed: false,
        // Private
        operationType: 'average',
        sourceField: 'memory',
      },
    });

    wrapper = mount(
      <IndexPatternDimensionEditorComponent {...defaultProps} state={stateWithNumberCol} />
    );

    act(() => {
      wrapper
        .find(EuiComboBox)
        .filter('[data-test-subj="indexPattern-dimension-format"]')
        .prop('onChange')!([{ value: 'bytes', label: 'Bytes' }]);
    });

    expect(setState.mock.calls[0]).toEqual([expect.any(Function)]);
    expect(setState.mock.calls[0][0](state)).toEqual({
      ...state,
      layers: {
        first: {
          ...state.layers.first,
          columns: {
            ...state.layers.first.columns,
            col1: expect.objectContaining({
              params: {
                format: { id: 'bytes', params: { decimals: 2 } },
              },
            }),
          },
        },
      },
    });
  });

  it('keeps decimal places while switching', () => {
    const stateWithNumberCol: IndexPatternPrivateState = getStateWithColumns({
      col1: {
        label: 'Average of memory',
        dataType: 'number',
        isBucketed: false,
        // Private
        operationType: 'average',
        sourceField: 'memory',
        params: {
          format: { id: 'bytes', params: { decimals: 0 } },
        },
      },
    });
    wrapper = mount(
      <IndexPatternDimensionEditorComponent {...defaultProps} state={stateWithNumberCol} />
    );

    act(() => {
      wrapper
        .find(EuiComboBox)
        .filter('[data-test-subj="indexPattern-dimension-format"]')
        .prop('onChange')!([{ value: '', label: 'Default' }]);
    });

    act(() => {
      wrapper
        .find(EuiComboBox)
        .filter('[data-test-subj="indexPattern-dimension-format"]')
        .prop('onChange')!([{ value: 'number', label: 'Number' }]);
    });

    expect(
      wrapper
        .find(EuiRange)
        .filter('[data-test-subj="indexPattern-dimension-formatDecimals"]')
        .prop('value')
    ).toEqual(0);
  });

  it('allows custom format with number of decimal places', () => {
    const stateWithNumberCol: IndexPatternPrivateState = getStateWithColumns({
      col1: {
        label: 'Average of memory',
        dataType: 'number',
        isBucketed: false,
        // Private
        operationType: 'average',
        sourceField: 'memory',
        params: {
          format: { id: 'bytes', params: { decimals: 2 } },
        },
      },
    });

    wrapper = mount(
      <IndexPatternDimensionEditorComponent {...defaultProps} state={stateWithNumberCol} />
    );

    act(() => {
      wrapper
        .find(EuiRange)
        .filter('[data-test-subj="indexPattern-dimension-formatDecimals"]')
        .prop('onChange')!({ currentTarget: { value: '0' } });
    });

    expect(setState.mock.calls[0]).toEqual([expect.any(Function)]);
    expect(setState.mock.calls[0][0](state)).toEqual({
      ...state,
      layers: {
        first: {
          ...state.layers.first,
          columns: {
            ...state.layers.first.columns,
            col1: expect.objectContaining({
              params: {
                format: { id: 'bytes', params: { decimals: 0 } },
              },
            }),
          },
        },
      },
    });
  });

  it('should hide the top level field selector when switching from non-reference to reference', () => {
    (generateId as jest.Mock).mockReturnValue(`second`);
    wrapper = mount(<IndexPatternDimensionEditorComponent {...defaultProps} />);

    expect(wrapper.find('ReferenceEditor')).toHaveLength(0);

    wrapper
      .find('button[data-test-subj="lns-indexPatternDimension-differences incompatible"]')
      .simulate('click');

    expect(wrapper.find('ReferenceEditor')).toHaveLength(1);
  });

  it('should hide the reference editors when switching from reference to non-reference', () => {
    const stateWithReferences: IndexPatternPrivateState = getStateWithColumns({
      col1: {
        label: 'Differences of (incomplete)',
        dataType: 'number',
        isBucketed: false,
        operationType: 'differences',
        references: ['col2'],
        params: {},
      },
    });

    wrapper = mount(
      <IndexPatternDimensionEditorComponent {...defaultProps} state={stateWithReferences} />
    );

    expect(wrapper.find('ReferenceEditor')).toHaveLength(1);

    wrapper
      .find('button[data-test-subj="lns-indexPatternDimension-average incompatible"]')
      .simulate('click');

    expect(wrapper.find('ReferenceEditor')).toHaveLength(0);
  });

  it('should show a warning when the current dimension is no longer configurable', () => {
    const stateWithInvalidCol: IndexPatternPrivateState = getStateWithColumns({
      col1: {
        label: 'Invalid differences',
        dataType: 'number',
        isBucketed: false,
        operationType: 'differences',
        references: ['ref1'],
      },
    });

    wrapper = mount(
      <IndexPatternDimensionEditorComponent {...defaultProps} state={stateWithInvalidCol} />
    );

    expect(
      wrapper
        .find('[data-test-subj="lns-indexPatternDimension-differences incompatible"]')
        .find('EuiText[color="danger"]')
        .first()
    ).toBeTruthy();
  });

  it('should remove options to select references when there are no time fields', () => {
    const stateWithoutTime: IndexPatternPrivateState = {
      ...getStateWithColumns({
        col1: {
          label: 'Avg',
          dataType: 'number',
          isBucketed: false,
          operationType: 'average',
          sourceField: 'bytes',
        },
      }),
      indexPatterns: {
        1: {
          id: '1',
          title: 'my-fake-index-pattern',
          hasRestrictions: false,
          fields: [
            {
              name: 'bytes',
              displayName: 'bytes',
              type: 'number',
              aggregatable: true,
              searchable: true,
            },
          ],
          getFieldByName: getFieldByNameFactory([
            {
              name: 'bytes',
              displayName: 'bytes',
              type: 'number',
              aggregatable: true,
              searchable: true,
            },
          ]),
        },
      },
    };

    wrapper = mount(
      <IndexPatternDimensionEditorComponent {...defaultProps} state={stateWithoutTime} />
    );

    expect(wrapper.find('[data-test-subj="lns-indexPatternDimension-differences"]')).toHaveLength(
      0
    );
  });

  it('should not show tabs when formula and static_value operations are not available', () => {
    const stateWithInvalidCol: IndexPatternPrivateState = getStateWithColumns({
      col1: {
        label: 'Average of memory',
        dataType: 'number',
        isBucketed: false,
        // Private
        operationType: 'average',
        sourceField: 'memory',
        params: {
          format: { id: 'bytes', params: { decimals: 2 } },
        },
      },
    });

    const props = {
      ...defaultProps,
      filterOperations: jest.fn((op) => {
        // the formula operation will fall into this metadata category
        return !(op.dataType === 'number' && op.scale === 'ratio');
      }),
    };

    wrapper = mount(
      <IndexPatternDimensionEditorComponent {...props} state={stateWithInvalidCol} />
    );

    expect(wrapper.find('[data-test-subj="lens-dimensionTabs"]').exists()).toBeFalsy();
  });

  it('should show the formula tab when supported', () => {
    const stateWithFormulaColumn: IndexPatternPrivateState = getStateWithColumns({
      col1: {
        label: 'Formula',
        dataType: 'number',
        isBucketed: false,
        operationType: 'formula',
        references: ['ref1'],
        params: {},
      },
    });

    wrapper = mount(
      <IndexPatternDimensionEditorComponent {...defaultProps} state={stateWithFormulaColumn} />
    );

    expect(
      wrapper.find('[data-test-subj="lens-dimensionTabs-formula"]').first().prop('isSelected')
    ).toBeTruthy();
  });

  it('should not show the static_value tab when not supported', () => {
    const stateWithFormulaColumn: IndexPatternPrivateState = getStateWithColumns({
      col1: {
        label: 'Formula',
        dataType: 'number',
        isBucketed: false,
        operationType: 'formula',
        references: ['ref1'],
        params: {},
      },
    });

    wrapper = mount(
      <IndexPatternDimensionEditorComponent {...defaultProps} state={stateWithFormulaColumn} />
    );

    expect(wrapper.find('[data-test-subj="lens-dimensionTabs-static_value"]').exists()).toBeFalsy();
  });

  it('should show the static value tab when supported', () => {
    const staticWithFormulaColumn: IndexPatternPrivateState = getStateWithColumns({
      col1: {
        label: 'Formula',
        dataType: 'number',
        isBucketed: false,
        operationType: 'formula',
        references: ['ref1'],
        params: {},
      },
    });

    wrapper = mount(
      <IndexPatternDimensionEditorComponent
        {...defaultProps}
        supportStaticValue
        state={staticWithFormulaColumn}
      />
    );

    expect(
      wrapper.find('[data-test-subj="lens-dimensionTabs-static_value"]').exists()
    ).toBeTruthy();
  });

  it('should select the quick function tab by default', () => {
    const stateWithNoColumn: IndexPatternPrivateState = getStateWithColumns({});

    wrapper = mount(
      <IndexPatternDimensionEditorComponent {...defaultProps} state={stateWithNoColumn} />
    );

    expect(
      wrapper
        .find('[data-test-subj="lens-dimensionTabs-quickFunctions"]')
        .first()
        .prop('isSelected')
    ).toBeTruthy();
  });

  it('should select the static value tab when supported by default', () => {
    const stateWithNoColumn: IndexPatternPrivateState = getStateWithColumns({});

    wrapper = mount(
      <IndexPatternDimensionEditorComponent
        {...defaultProps}
        supportStaticValue
        state={stateWithNoColumn}
      />
    );

    expect(
      wrapper.find('[data-test-subj="lens-dimensionTabs-static_value"]').first().prop('isSelected')
    ).toBeTruthy();
  });

  it('should not show any tab when formula is in full screen mode', () => {
    const stateWithFormulaColumn: IndexPatternPrivateState = getStateWithColumns({
      col1: {
        label: 'Formula',
        dataType: 'number',
        isBucketed: false,
        operationType: 'formula',
        references: ['ref1'],
        params: {},
      },
    });

    wrapper = mount(
      <IndexPatternDimensionEditorComponent
        {...defaultProps}
        state={stateWithFormulaColumn}
        supportStaticValue
        isFullscreen
      />
    );

    expect(wrapper.find('[data-test-subj="lens-dimensionTabs"]').exists()).toBeFalsy();
  });
});
