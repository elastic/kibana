/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount, shallow } from 'enzyme';
import React from 'react';
import { EuiComboBox } from '@elastic/eui';
import { IndexPatternPrivateState } from './indexpattern';
import { getColumnOrder, getPotentialColumns } from './operations';
import { IndexPatternDimensionPanel } from './dimension_panel';

jest.mock('./operations');

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
          dataType: 'date',
          isBucketed: false,

          // Private
          operationType: 'value',
          sourceField: 'timestamp',
        },
      },
    };

    jest.clearAllMocks();
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

  it('should pass the right arguments to getPotentialColumns', async () => {
    shallow(
      <IndexPatternDimensionPanel
        state={state}
        setState={() => {}}
        columnId={'col1'}
        filterOperations={() => true}
        suggestedPriority={1}
      />
    );

    expect(getPotentialColumns as jest.Mock).toHaveBeenCalledWith(state, 'col1', 1);
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

  it('should list all field names in sorted order', () => {
    const wrapper = shallow(
      <IndexPatternDimensionPanel
        state={state}
        setState={() => {}}
        columnId={'col1'}
        filterOperations={() => true}
      />
    );

    const options = wrapper.find(EuiComboBox).prop('options');

    expect(options!.map(({ label }) => label)).toEqual([
      'bytes',
      'documents',
      'source',
      'timestamp',
    ]);
  });

  it("should disable functions that won't work with the current column", () => {
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
        col2: expect.objectContaining({
          sourceField: firstOption.label,
          // Other parts of this don't matter for this test
        }),
      },
      columnOrder: ['col1', 'col2'],
    });
  });

  it('should always request the new sort order when changing the function', () => {
    const setState = jest.fn();

    const wrapper = shallow(
      <IndexPatternDimensionPanel
        state={state}
        setState={setState}
        columnId={'col1'}
        filterOperations={() => true}
        suggestedPriority={1}
      />
    );

    wrapper.find('[data-test-subj="lns-indexPatternDimension-date_histogram"]').simulate('click');

    expect(getColumnOrder).toHaveBeenCalledWith({
      col1: expect.objectContaining({
        sourceField: 'timestamp',
        operationType: 'date_histogram',
      }),
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
        col2: expect.objectContaining({
          operationId: firstField.value,
          label: 'Value of bytes',
          dataType: 'number',
          isBucketed: false,
          operationType: 'value',
          sourceField: 'bytes',
        }),
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

describe('multiple IndexPatternDimensionPanels', () => {
  let state: IndexPatternPrivateState;

  describe('with an empty state', () => {
    beforeEach(() => {
      state = {
        indexPatterns: expectedIndexPatterns,
        currentIndexPatternId: '1',
        columnOrder: [],
        columns: {},
      };

      jest.clearAllMocks();
    });

    it('should enable all options on both dimensions', () => {
      const wrapper1 = shallow(
        <IndexPatternDimensionPanel
          state={state}
          setState={() => {}}
          columnId={'col1'}
          filterOperations={() => true}
        />
      );

      const wrapper2 = shallow(
        <IndexPatternDimensionPanel
          state={state}
          setState={() => {}}
          columnId={'col2'}
          filterOperations={() => true}
        />
      );

      expect(
        wrapper1
          .find('[data-test-subj^="lns-indexPatternDimension-"]')
          .some(n => n.prop('isDisabled'))
      ).toEqual(false);

      expect(
        wrapper1
          .find('[data-test-subj^="lns-indexPatternDimension-"]')
          .map(n => n.prop('isDisabled'))
      ).toEqual(
        wrapper2
          .find('[data-test-subj^="lns-indexPatternDimension-"]')
          .map(n => n.prop('isDisabled'))
      );
    });
  });

  describe('with a prior selection on one dimension', () => {
    beforeEach(() => {
      state = {
        indexPatterns: expectedIndexPatterns,
        currentIndexPatternId: '1',
        columnOrder: ['col1'],
        columns: {
          col1: {
            operationId: 'op1',
            label: 'Value of timestamp',
            dataType: 'date',
            isBucketed: false,

            // Private
            operationType: 'value',
            sourceField: 'timestamp',
          },
        },
      };

      jest.clearAllMocks();
    });

    it('should show all functions enabled on the selected dimension', () => {
      const wrapper1 = shallow(
        <IndexPatternDimensionPanel
          state={state}
          setState={() => {}}
          columnId={'col1'}
          filterOperations={() => true}
        />
      );

      expect(
        wrapper1
          .find('[data-test-subj^="lns-indexPatternDimension-"]')
          .map(n => n.prop('isDisabled'))
      ).not.toContain([true]);
    });

    it('should limit the second dimension to only values', () => {
      const wrapper2 = shallow(
        <IndexPatternDimensionPanel
          state={state}
          setState={() => {}}
          columnId={'col2'}
          filterOperations={() => true}
        />
      );

      expect(
        wrapper2.find('[data-test-subj="lns-indexPatternDimension-value"]').prop('isDisabled')
      ).toEqual(false);
      expect(
        wrapper2.find('[data-test-subj="lns-indexPatternDimension-count"]').prop('isDisabled')
      ).toEqual(false);
      expect(
        wrapper2.find('[data-test-subj="lns-indexPatternDimension-count"]').prop('color')
      ).toEqual('danger');
    });
  });
});
