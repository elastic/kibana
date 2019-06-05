/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount, shallow } from 'enzyme';
import React from 'react';
import { EuiComboBox } from '@elastic/eui';
import { IndexPatternPrivateState } from './indexpattern';
import { getColumnOrder, getPotentialColumns, IndexPatternDimensionPanel } from './dimension_panel';

const expectedIndexPatterns = {
  1: {
    id: '1',
    title: 'my-fake-index-pattern',
    timeFieldName: 'timestamp',
    fields: [
      {
        name: 'timestamp',
        type: 'date',
        aggregatable: true,
        searchable: true,
      },
      {
        name: 'bytes',
        type: 'number',
        aggregatable: true,
        searchable: true,
      },
      {
        name: 'source',
        type: 'string',
        aggregatable: true,
        searchable: true,
      },
    ],
  },
};

describe('IndexPatternDimensionPanel', () => {
  let state: IndexPatternPrivateState;

  beforeEach(() => {
    state = {
      indexPatterns: expectedIndexPatterns,
      currentIndexPatternId: '1',
      columnOrder: ['col1'],
      columns: {
        col1: {
          operationId: 'op1',
          label: 'Value of timestamp',
          dataType: 'string',
          isBucketed: false,

          // Private
          operationType: 'value',
          sourceField: 'timestamp',
        },
      },
    };
  });

  describe('getPotentialColumns', () => {
    it('should include priority', () => {
      const columns = getPotentialColumns(state, 1);

      expect(columns.every(col => col.suggestedOrder === 1)).toEqual(true);
    });

    it('should list operations by field for a regular index pattern', () => {
      const columns = getPotentialColumns(state);

      expect(columns.map(col => [col.sourceField, col.operationType])).toMatchInlineSnapshot(`
Array [
  Array [
    "timestamp",
    "value",
  ],
  Array [
    "timestamp",
    "date_histogram",
  ],
  Array [
    "bytes",
    "value",
  ],
  Array [
    "bytes",
    "sum",
  ],
  Array [
    "bytes",
    "avg",
  ],
  Array [
    "bytes",
    "min",
  ],
  Array [
    "bytes",
    "max",
  ],
  Array [
    "source",
    "value",
  ],
  Array [
    "source",
    "terms",
  ],
  Array [
    "documents",
    "count",
  ],
]
`);
    });
  });

  it('should render a dimension panel', () => {
    const wrapper = shallow(
      <IndexPatternDimensionPanel
        state={state}
        setState={() => {}}
        columnId={'col2'}
        filterOperations={() => true}
      />
    );

    expect(wrapper).toMatchSnapshot();
  });

  it('should display a call to action in the popover button', () => {
    const wrapper = mount(
      <IndexPatternDimensionPanel
        state={state}
        setState={() => {}}
        columnId={'col2'}
        filterOperations={() => true}
      />
    );
    expect(
      wrapper
        .find('[data-test-subj="indexPattern-dimensionPopover-button"]')
        .first()
        .text()
    ).toEqual('Configure dimension');
  });

  it('should call the filterOperations function', () => {
    const filterOperations = jest.fn().mockReturnValue(true);

    shallow(
      <IndexPatternDimensionPanel
        state={state}
        setState={() => {}}
        columnId={'col2'}
        filterOperations={filterOperations}
      />
    );

    expect(filterOperations).toBeCalled();
  });

  it('should not show any choices if the filter returns false', () => {
    const wrapper = shallow(
      <IndexPatternDimensionPanel
        state={state}
        setState={() => {}}
        columnId={'col2'}
        filterOperations={() => false}
      />
    );

    expect(wrapper.find(EuiComboBox)!.prop('options')!.length).toEqual(0);
  });

  it("should disable functions that won't work with dates", () => {
    const setState = jest.fn();

    const wrapper = shallow(
      <IndexPatternDimensionPanel
        state={state}
        setState={setState}
        columnId={'col1'}
        filterOperations={() => true}
      />
    );

    expect(
      wrapper.find('[data-test-subj="lns-indexPatternDimension-value"]').prop('color')
    ).toEqual('primary');
    expect(
      wrapper.find('[data-test-subj="lns-indexPatternDimension-value"]').prop('isDisabled')
    ).toEqual(false);
    expect(
      wrapper.find('[data-test-subj="lns-indexPatternDimension-terms"]').prop('isDisabled')
    ).toEqual(true);
    expect(
      wrapper.find('[data-test-subj="lns-indexPatternDimension-date_histogram"]').prop('isDisabled')
    ).toEqual(false);
    expect(
      wrapper.find('[data-test-subj="lns-indexPatternDimension-sum"]').prop('isDisabled')
    ).toEqual(true);
    expect(
      wrapper.find('[data-test-subj="lns-indexPatternDimension-avg"]').prop('isDisabled')
    ).toEqual(true);
    expect(
      wrapper.find('[data-test-subj="lns-indexPatternDimension-count"]').prop('isDisabled')
    ).toEqual(true);
  });

  it('should update the datasource state on selection of a value operation', () => {
    const setState = jest.fn();

    const wrapper = shallow(
      <IndexPatternDimensionPanel
        state={state}
        setState={setState}
        columnId={'col2'}
        filterOperations={() => true}
        suggestedPriority={1}
      />
    );

    const comboBox = wrapper.find(EuiComboBox)!;
    const firstOption = comboBox.prop('options')![0];

    comboBox.prop('onChange')!([firstOption]);

    expect(setState).toHaveBeenCalledWith({
      ...state,
      columns: {
        ...state.columns,
        col2: {
          operationId: firstOption.value,
          label: 'Value of timestamp',
          dataType: 'date',
          isBucketed: false,
          operationType: 'value',
          sourceField: 'timestamp',
          suggestedOrder: 1,
        },
      },
      columnOrder: ['col1', 'col2'],
    });
  });

  it('should update the datasource state when the user makes a selection', () => {
    const setState = jest.fn();

    const wrapper = shallow(
      <IndexPatternDimensionPanel
        state={state}
        setState={setState}
        columnId={'col2'}
        filterOperations={op => op.dataType === 'number'}
      />
    );

    const comboBox = wrapper.find(EuiComboBox)!;
    const firstField = comboBox.prop('options')![0];

    comboBox.prop('onChange')!([firstField]);

    expect(setState).toHaveBeenCalledWith({
      ...state,
      columns: {
        ...state.columns,
        col2: {
          operationId: firstField.value,
          label: 'Value of bytes',
          dataType: 'number',
          isBucketed: false,
          operationType: 'value',
          sourceField: 'bytes',
        },
      },
      columnOrder: ['col1', 'col2'],
    });
  });

  it('should clear the dimension with the clear button', () => {
    const setState = jest.fn();

    const wrapper = shallow(
      <IndexPatternDimensionPanel
        state={state}
        setState={setState}
        columnId={'col1'}
        filterOperations={() => true}
      />
    );

    const clearButton = wrapper.find('[data-test-subj="indexPattern-dimensionPopover-remove"]');

    clearButton.simulate('click');

    expect(setState).toHaveBeenCalledWith({
      ...state,
      columns: {},
      columnOrder: [],
    });
  });
});

describe('getColumnOrder', () => {
  it('should work for empty columns', () => {});

  it('should work for one column', () => {
    expect(
      getColumnOrder({
        col1: {
          operationId: 'op1',
          label: 'Value of timestamp',
          dataType: 'string',
          isBucketed: false,

          // Private
          operationType: 'value',
          sourceField: 'timestamp',
        },
      })
    ).toEqual(['col1']);
  });

  it('should put any number of aggregations before metrics', () => {
    expect(
      getColumnOrder({
        col1: {
          operationId: 'op1',
          label: 'Top Values of category',
          dataType: 'string',
          isBucketed: true,

          // Private
          operationType: 'value',
          sourceField: 'timestamp',
        },
        col2: {
          operationId: 'op2',
          label: 'Average of bytes',
          dataType: 'number',
          isBucketed: false,

          // Private
          operationType: 'value',
          sourceField: 'bytes',
        },
        col3: {
          operationId: 'op3',
          label: 'Date Histogram of timestamp',
          dataType: 'date',
          isBucketed: true,

          // Private
          operationType: 'date_histogram',
          sourceField: 'timestamp',
        },
      })
    ).toEqual(['col1', 'col3', 'col2']);
  });

  it('should reorder aggregations based on suggested priority', () => {
    expect(
      getColumnOrder({
        col1: {
          operationId: 'op1',
          label: 'Top Values of category',
          dataType: 'string',
          isBucketed: true,

          // Private
          operationType: 'value',
          sourceField: 'timestamp',
          suggestedOrder: 2,
        },
        col2: {
          operationId: 'op2',
          label: 'Average of bytes',
          dataType: 'number',
          isBucketed: false,

          // Private
          operationType: 'value',
          sourceField: 'bytes',
          suggestedOrder: 0,
        },
        col3: {
          operationId: 'op3',
          label: 'Date Histogram of timestamp',
          dataType: 'date',
          isBucketed: true,

          // Private
          operationType: 'date_histogram',
          sourceField: 'timestamp',
          suggestedOrder: 1,
        },
      })
    ).toEqual(['col3', 'col1', 'col2']);
  });
});
