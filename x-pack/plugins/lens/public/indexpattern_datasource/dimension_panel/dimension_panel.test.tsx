/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ReactWrapper, ShallowWrapper } from 'enzyme';
import React, { ChangeEvent, MouseEvent } from 'react';
import { act } from 'react-dom/test-utils';
import { EuiComboBox, EuiListGroupItemProps, EuiListGroup, EuiRange } from '@elastic/eui';
import { DataPublicPluginStart } from '../../../../../../src/plugins/data/public';
import {
  IndexPatternDimensionEditorComponent,
  IndexPatternDimensionEditorProps,
} from './dimension_panel';
import { mountWithIntl as mount, shallowWithIntl as shallow } from '@kbn/test/jest';
import { IUiSettingsClient, SavedObjectsClientContract, HttpSetup, CoreSetup } from 'kibana/public';
import { IStorageWrapper } from 'src/plugins/kibana_utils/public';
import { IndexPatternPrivateState } from '../types';
import { IndexPatternColumn, replaceColumn } from '../operations';
import { documentField } from '../document_field';
import { OperationMetadata } from '../../types';
import { DateHistogramIndexPatternColumn } from '../operations/definitions/date_histogram';
import { getFieldByNameFactory } from '../pure_helpers';
import { TimeScaling } from './time_scaling';
import { EuiSelect } from '@elastic/eui';
import { EuiButtonIcon } from '@elastic/eui';
import { DimensionEditor } from './dimension_editor';

jest.mock('../loader');
jest.mock('../operations');
jest.mock('lodash', () => {
  const original = jest.requireActual('lodash');

  return {
    ...original,
    debounce: (fn: unknown) => fn,
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

const bytesColumn: IndexPatternColumn = {
  label: 'Max of bytes',
  dataType: 'number',
  isBucketed: false,

  // Private
  operationType: 'max',
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
 *
 * - canHandleDrop: Tests for dropping of fields or other dimensions
 * - onDrop: Correct application of drop logic
 */
describe('IndexPatternDimensionEditorPanel', () => {
  let state: IndexPatternPrivateState;
  let setState: jest.Mock;
  let defaultProps: IndexPatternDimensionEditorProps;

  function getStateWithColumns(columns: Record<string, IndexPatternColumn>) {
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
            },
          },
          incompleteColumns: {},
        },
      },
    };

    setState = jest.fn().mockImplementation((newState) => {
      if (wrapper instanceof ReactWrapper) {
        wrapper.setProps({ state: newState });
      }
    });

    defaultProps = {
      state,
      setState,
      dateRange: { fromDate: 'now-1d', toDate: 'now' },
      columnId: 'col1',
      layerId: 'first',
      uniqueLabel: 'stuff',
      filterOperations: () => true,
      storage: {} as IStorageWrapper,
      uiSettings: {} as IUiSettingsClient,
      savedObjectsClient: {} as SavedObjectsClientContract,
      http: {} as HttpSetup,
      data: ({
        fieldFormats: ({
          getType: jest.fn().mockReturnValue({
            id: 'number',
            title: 'Number',
          }),
          getDefaultType: jest.fn().mockReturnValue({
            id: 'bytes',
            title: 'Bytes',
          }),
        } as unknown) as DataPublicPluginStart['fieldFormats'],
      } as unknown) as DataPublicPluginStart,
      core: {} as CoreSetup,
      dimensionGroups: [],
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
          },
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

    expect(options![0]['data-test-subj']).toEqual('lns-fieldOptionIncompatible-Records');

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

    expect(items.find(({ label }) => label === 'Minimum')!['data-test-subj']).not.toContain(
      'incompatible'
    );

    expect(items.find(({ label }) => label === 'Date histogram')!['data-test-subj']).toContain(
      'incompatible'
    );

    // Fieldless operation is compatible with field
    expect(items.find(({ label }) => label === 'Filters')!['data-test-subj']).toContain(
      'compatible'
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

    expect(setState).toHaveBeenCalledWith(
      {
        ...initialState,
        layers: {
          first: {
            ...state.layers.first,
            columns: {
              ...state.layers.first.columns,
              col1: expect.objectContaining({
                operationType: 'max',
                sourceField: 'memory',
                params: { format: { id: 'bytes' } },
                // Other parts of this don't matter for this test
              }),
            },
          },
        },
      },
      true
    );
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

    expect(setState).toHaveBeenCalledWith(
      {
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
      },
      true
    );
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

    expect(setState).toHaveBeenCalledWith(
      {
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
      },
      true
    );
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

    expect(setState).toHaveBeenCalledWith({
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

    expect(setState).toHaveBeenCalledWith(
      {
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
      },
      true
    );
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

    expect(setState).toHaveBeenCalledWith(
      {
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
      },
      true
    );
  });

  describe('transient invalid state', () => {
    it('should set the state if selecting an operation incompatible with the current field', () => {
      wrapper = mount(<IndexPatternDimensionEditorComponent {...defaultProps} />);

      act(() => {
        wrapper
          .find('button[data-test-subj="lns-indexPatternDimension-terms incompatible"]')
          .simulate('click');
      });

      expect(setState).toHaveBeenCalledWith(
        {
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
        },
        true
      );
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
      wrapper = mount(<IndexPatternDimensionEditorComponent {...defaultProps} />);

      wrapper
        .find('button[data-test-subj="lns-indexPatternDimension-terms incompatible"]')
        .simulate('click');

      wrapper
        .find('button[data-test-subj="lns-indexPatternDimension-filters incompatible"]')
        .simulate('click');

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
            },
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

      wrapper.find('button[data-test-subj="lns-indexPatternDimension-avg"]').simulate('click');
      expect(setState).toHaveBeenCalledWith(
        {
          ...state,
          layers: {
            first: {
              ...state.layers.first,
              incompleteColumns: {
                col2: { operationType: 'avg' },
              },
            },
          },
        },
        false
      );

      const comboBox = wrapper
        .find(EuiComboBox)
        .filter('[data-test-subj="indexPattern-dimension-field"]');
      const options = comboBox.prop('options');

      // options[1][2] is a `source` field of type `string` which doesn't support `avg` operation
      act(() => {
        comboBox.prop('onChange')!([options![1].options![2]]);
      });

      expect(setState).toHaveBeenLastCalledWith(
        {
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
        },
        true
      );
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
              operationType: 'avg',
              sourceField: 'bytes',
            },
          })}
          columnId="col2"
        />
      );

      wrapper
        .find('button[data-test-subj="lns-indexPatternDimension-count incompatible"]')
        .simulate('click');

      const newColumnState = setState.mock.calls[0][0].layers.first.columns.col2;
      expect(newColumnState.operationType).toEqual('count');
      expect(newColumnState.sourceField).toEqual('Records');
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
              sourceField: 'Records',
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

      expect(setState).toHaveBeenLastCalledWith(
        {
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
        },
        true
      );
    });
  });

  describe('time scaling', () => {
    function getProps(colOverrides: Partial<IndexPatternColumn>) {
      return {
        ...defaultProps,
        state: getStateWithColumns({
          datecolumn: {
            dataType: 'date',
            isBucketed: true,
            label: '',
            operationType: 'date_histogram',
            sourceField: 'ts',
            params: {
              interval: '1d',
            },
          },
          col2: {
            dataType: 'number',
            isBucketed: false,
            label: 'Count of records',
            operationType: 'count',
            sourceField: 'Records',
            ...colOverrides,
          } as IndexPatternColumn,
        }),
        columnId: 'col2',
      };
    }
    it('should not show custom options if time scaling is not available', () => {
      wrapper = mount(
        <IndexPatternDimensionEditorComponent
          {...getProps({
            operationType: 'avg',
            sourceField: 'bytes',
          })}
        />
      );
      expect(wrapper.find('[data-test-subj="indexPattern-time-scaling"]')).toHaveLength(0);
    });

    it('should show custom options if time scaling is available', () => {
      wrapper = mount(<IndexPatternDimensionEditorComponent {...getProps({})} />);
      expect(
        wrapper
          .find(TimeScaling)
          .find('[data-test-subj="indexPattern-time-scaling-popover"]')
          .exists()
      ).toBe(true);
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
      wrapper = shallow(<IndexPatternDimensionEditorComponent {...props} />);
      wrapper
        .find(DimensionEditor)
        .dive()
        .find(TimeScaling)
        .dive()
        .find('[data-test-subj="indexPattern-time-scaling-enable"]')
        .prop('onClick')!({} as MouseEvent);
      expect(props.setState).toHaveBeenCalledWith(
        {
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
        },
        true
      );
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
      expect(props.setState).toHaveBeenCalledWith(
        {
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
        },
        true
      );
    });

    it('should not carry over time scaling if the other operation does not support it', () => {
      const props = getProps({
        timeScale: 'h',
        sourceField: 'bytes',
        operationType: 'sum',
        label: 'Sum of bytes per hour',
      });
      wrapper = mount(<IndexPatternDimensionEditorComponent {...props} />);
      wrapper.find('button[data-test-subj="lns-indexPatternDimension-avg"]').simulate('click');
      expect(props.setState).toHaveBeenCalledWith(
        {
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
        },
        true
      );
    });

    it('should allow to change time scaling', () => {
      const props = getProps({ timeScale: 's', label: 'Count of records per second' });
      wrapper = mount(<IndexPatternDimensionEditorComponent {...props} />);
      wrapper
        .find('[data-test-subj="indexPattern-time-scaling-unit"]')
        .find(EuiSelect)
        .prop('onChange')!(({
        target: { value: 'h' },
      } as unknown) as ChangeEvent<HTMLSelectElement>);
      expect(props.setState).toHaveBeenCalledWith(
        {
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
        },
        true
      );
    });

    it('should not adjust label if it is custom', () => {
      const props = getProps({ timeScale: 's', customLabel: true, label: 'My label' });
      wrapper = mount(<IndexPatternDimensionEditorComponent {...props} />);
      wrapper
        .find('[data-test-subj="indexPattern-time-scaling-unit"]')
        .find(EuiSelect)
        .prop('onChange')!(({
        target: { value: 'h' },
      } as unknown) as ChangeEvent<HTMLSelectElement>);
      expect(props.setState).toHaveBeenCalledWith(
        {
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
        },
        true
      );
    });

    it('should allow to remove time scaling', () => {
      const props = getProps({ timeScale: 's', label: 'Count of records per second' });
      wrapper = mount(<IndexPatternDimensionEditorComponent {...props} />);
      wrapper
        .find('[data-test-subj="indexPattern-time-scaling-remove"]')
        .find(EuiButtonIcon)
        .prop('onClick')!(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        {} as any
      );
      expect(props.setState).toHaveBeenCalledWith(
        {
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
        },
        true
      );
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

    wrapper.find('button[data-test-subj="lns-indexPatternDimension-avg"]').simulate('click');

    expect(setState).toHaveBeenCalledWith(
      {
        ...state,
        layers: {
          first: {
            ...state.layers.first,
            incompleteColumns: {
              col2: {
                operationType: 'avg',
              },
            },
          },
        },
      },
      false
    );

    const comboBox = wrapper
      .find(EuiComboBox)
      .filter('[data-test-subj="indexPattern-dimension-field"]');
    const options = comboBox.prop('options');

    act(() => {
      comboBox.prop('onChange')!([options![1].options![0]]);
    });

    expect(setState).toHaveBeenCalledWith(
      {
        ...state,
        layers: {
          first: {
            ...state.layers.first,
            columns: {
              ...state.layers.first.columns,
              col2: expect.objectContaining({
                sourceField: 'bytes',
                operationType: 'avg',
                // Other parts of this don't matter for this test
              }),
            },
            columnOrder: ['col1', 'col2'],
          },
        },
      },
      true
    );
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

    wrapper.find('button[data-test-subj="lns-indexPatternDimension-avg"]').simulate('click');

    expect(setState).toHaveBeenCalledWith(
      {
        ...initialState,
        layers: {
          first: {
            ...initialState.layers.first,
            columns: {
              ...initialState.layers.first.columns,
              col2: expect.objectContaining({
                sourceField: 'bytes',
                operationType: 'avg',
                // Other parts of this don't matter for this test
              }),
            },
            columnOrder: ['col1', 'col2'],
          },
        },
      },
      true
    );
  });

  it('should select operation directly if only document is possible', () => {
    wrapper = mount(<IndexPatternDimensionEditorComponent {...defaultProps} columnId={'col2'} />);

    wrapper.find('button[data-test-subj="lns-indexPatternDimension-count"]').simulate('click');

    expect(setState).toHaveBeenCalledWith(
      {
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
      },
      true
    );
  });

  it('should indicate compatible fields when selecting the operation first', () => {
    wrapper = mount(<IndexPatternDimensionEditorComponent {...defaultProps} columnId={'col2'} />);

    wrapper.find('button[data-test-subj="lns-indexPatternDimension-avg"]').simulate('click');

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
            sourceField: 'Records',
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
      'Last value',
      'Maximum',
      'Median',
      'Minimum',
      'Sum',
      'Unique count',
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

    expect(setState).toHaveBeenCalledWith(
      {
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
      },
      true
    );
  });

  it('should use helper function when changing the function', () => {
    const initialState: IndexPatternPrivateState = getStateWithColumns({
      col1: bytesColumn,
    });
    wrapper = mount(
      <IndexPatternDimensionEditorComponent {...defaultProps} state={initialState} />
    );

    act(() => {
      wrapper.find('[data-test-subj="lns-indexPatternDimension-min"]').first().prop('onClick')!(
        {} as MouseEvent
      );
    });

    expect(replaceColumn).toHaveBeenCalledWith(
      expect.objectContaining({
        columnId: 'col1',
        op: 'min',
        field: expect.objectContaining({ name: 'bytes' }),
      })
    );
  });

  it('should clear the dimension when removing the selection in field combobox', () => {
    wrapper = mount(<IndexPatternDimensionEditorComponent {...defaultProps} />);

    act(() => {
      wrapper
        .find(EuiComboBox)
        .filter('[data-test-subj="indexPattern-dimension-field"]')
        .prop('onChange')!([]);
    });

    expect(setState).toHaveBeenCalledWith(
      {
        ...state,
        layers: {
          first: {
            indexPatternId: '1',
            columns: {},
            columnOrder: [],
            incompleteColumns: {},
          },
        },
      },
      false
    );
  });

  it('allows custom format', () => {
    const stateWithNumberCol: IndexPatternPrivateState = getStateWithColumns({
      col1: {
        label: 'Average of memory',
        dataType: 'number',
        isBucketed: false,
        // Private
        operationType: 'avg',
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

    expect(setState).toHaveBeenCalledWith({
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
        operationType: 'avg',
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
        operationType: 'avg',
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

    expect(setState).toHaveBeenCalledWith({
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
});
