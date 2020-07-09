/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { ChangeEvent } from 'react';
import { createMockedDragDropContext } from './mocks';
import { dataPluginMock } from '../../../../../src/plugins/data/public/mocks';
import { InnerIndexPatternDataPanel, IndexPatternDataPanel, MemoizedDataPanel } from './datapanel';
import { FieldItem } from './field_item';
import { NoFieldsCallout } from './no_fields_callout';
import { act } from 'react-dom/test-utils';
import { coreMock } from 'src/core/public/mocks';
import { IndexPatternPrivateState } from './types';
import { mountWithIntl, shallowWithIntl } from 'test_utils/enzyme_helpers';
import { ChangeIndexPattern } from './change_indexpattern';
import { EuiProgress, EuiLoadingSpinner } from '@elastic/eui';
import { documentField } from './document_field';
import { chartPluginMock } from '../../../../../src/plugins/charts/public/mocks';

const initialState: IndexPatternPrivateState = {
  indexPatternRefs: [],
  existingFields: {},
  currentIndexPatternId: '1',
  layers: {
    first: {
      indexPatternId: '1',
      columnOrder: ['col1', 'col2'],
      columns: {
        col1: {
          label: 'My Op',
          dataType: 'string',
          isBucketed: true,
          operationType: 'terms',
          sourceField: 'source',
          params: {
            size: 5,
            orderDirection: 'asc',
            orderBy: {
              type: 'alphabetical',
            },
          },
        },
        col2: {
          label: 'My Op',
          dataType: 'number',
          isBucketed: false,
          operationType: 'avg',
          sourceField: 'memory',
        },
      },
    },
    second: {
      indexPatternId: '1',
      columnOrder: ['col1', 'col2'],
      columns: {
        col1: {
          label: 'My Op',
          dataType: 'string',
          isBucketed: true,
          operationType: 'terms',
          sourceField: 'source',
          params: {
            size: 5,
            orderDirection: 'asc',
            orderBy: {
              type: 'alphabetical',
            },
          },
        },
        col2: {
          label: 'My Op',
          dataType: 'number',
          isBucketed: false,
          operationType: 'avg',
          sourceField: 'bytes',
        },
      },
    },
  },
  indexPatterns: {
    '1': {
      id: '1',
      title: 'idx1',
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
          name: 'memory',
          type: 'number',
          aggregatable: true,
          searchable: true,
        },
        {
          name: 'unsupported',
          type: 'geo',
          aggregatable: true,
          searchable: true,
        },
        {
          name: 'source',
          type: 'string',
          aggregatable: true,
          searchable: true,
        },
        {
          name: 'client',
          type: 'ip',
          aggregatable: true,
          searchable: true,
        },
        documentField,
      ],
    },
    '2': {
      id: '2',
      title: 'idx2',
      timeFieldName: 'timestamp',
      fields: [
        {
          name: 'timestamp',
          type: 'date',
          aggregatable: true,
          searchable: true,
          aggregationRestrictions: {
            date_histogram: {
              agg: 'date_histogram',
              fixed_interval: '1d',
              delay: '7d',
              time_zone: 'UTC',
            },
          },
        },
        {
          name: 'bytes',
          type: 'number',
          aggregatable: true,
          searchable: true,
          aggregationRestrictions: {
            histogram: {
              agg: 'histogram',
              interval: 1000,
            },
            max: {
              agg: 'max',
            },
            min: {
              agg: 'min',
            },
            sum: {
              agg: 'sum',
            },
          },
        },
        {
          name: 'source',
          type: 'string',
          aggregatable: true,
          searchable: true,
          aggregationRestrictions: {
            terms: {
              agg: 'terms',
            },
          },
        },
        documentField,
      ],
    },
    '3': {
      id: '3',
      title: 'idx3',
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
        documentField,
      ],
    },
  },
  isFirstExistenceFetch: false,
};

const dslQuery = { bool: { must: [{ match_all: {} }], filter: [], should: [], must_not: [] } };

describe('IndexPattern Data Panel', () => {
  let defaultProps: Parameters<typeof InnerIndexPatternDataPanel>[0] & {
    showNoDataPopover: () => void;
  };
  let core: ReturnType<typeof coreMock['createSetup']>;

  beforeEach(() => {
    core = coreMock.createSetup();
    defaultProps = {
      indexPatternRefs: [],
      existingFields: {},
      data: dataPluginMock.createStartContract(),
      dragDropContext: createMockedDragDropContext(),
      currentIndexPatternId: '1',
      indexPatterns: initialState.indexPatterns,
      onChangeIndexPattern: jest.fn(),
      core,
      dateRange: {
        fromDate: 'now-7d',
        toDate: 'now',
      },
      charts: chartPluginMock.createSetupContract(),
      query: { query: '', language: 'lucene' },
      filters: [],
      showNoDataPopover: jest.fn(),
    };
  });

  it('should call change index pattern callback', async () => {
    const setStateSpy = jest.fn();
    const state = {
      ...initialState,
      layers: { first: { indexPatternId: '1', columnOrder: [], columns: {} } },
    };
    const changeIndexPattern = jest.fn();
    const wrapper = shallowWithIntl(
      <IndexPatternDataPanel
        changeIndexPattern={changeIndexPattern}
        {...defaultProps}
        state={state}
        setState={setStateSpy}
        dragDropContext={{ dragging: {}, setDragging: () => {} }}
      />
    );

    wrapper.find(MemoizedDataPanel).prop('onChangeIndexPattern')!('2');

    expect(changeIndexPattern).toHaveBeenCalledWith('2', state, setStateSpy);
  });

  it('should render a warning if there are no index patterns', () => {
    const wrapper = shallowWithIntl(
      <IndexPatternDataPanel
        {...defaultProps}
        state={{
          ...initialState,
          currentIndexPatternId: '',
          indexPatterns: {},
        }}
        setState={jest.fn()}
        dragDropContext={{ dragging: {}, setDragging: () => {} }}
        changeIndexPattern={jest.fn()}
      />
    );
    expect(wrapper.find('[data-test-subj="indexPattern-no-indexpatterns"]')).toHaveLength(1);
  });

  it('should call setState when the index pattern is switched', async () => {
    const wrapper = shallowWithIntl(<InnerIndexPatternDataPanel {...defaultProps} />);

    wrapper.find(ChangeIndexPattern).prop('onChangeIndexPattern')('2');

    expect(defaultProps.onChangeIndexPattern).toHaveBeenCalledWith('2');
  });

  describe('loading existence data', () => {
    function testProps() {
      const setState = jest.fn();
      core.http.post.mockImplementation(async (path) => {
        const parts = ((path as unknown) as string).split('/');
        const indexPatternTitle = parts[parts.length - 1];
        return {
          indexPatternTitle: `${indexPatternTitle}_testtitle`,
          existingFieldNames: ['field_1', 'field_2'].map(
            (fieldName) => `${indexPatternTitle}_${fieldName}`
          ),
        };
      });
      return {
        ...defaultProps,
        changeIndexPattern: jest.fn(),
        setState,
        dragDropContext: { dragging: {}, setDragging: () => {} },
        dateRange: { fromDate: '2019-01-01', toDate: '2020-01-01' },
        state: {
          indexPatternRefs: [],
          existingFields: {},
          isFirstExistenceFetch: false,
          currentIndexPatternId: 'a',
          indexPatterns: {
            a: { id: 'a', title: 'aaa', timeFieldName: 'atime', fields: [] },
            b: { id: 'b', title: 'bbb', timeFieldName: 'btime', fields: [] },
          },
          layers: {
            1: {
              indexPatternId: 'a',
              columnOrder: [],
              columns: {},
            },
          },
        } as IndexPatternPrivateState,
      };
    }

    async function testExistenceLoading(
      stateChanges?: unknown,
      propChanges?: unknown,
      props = testProps()
    ) {
      const inst = mountWithIntl(<IndexPatternDataPanel {...props} />);

      await act(async () => {
        inst.update();
      });

      if (stateChanges || propChanges) {
        await act(async () => {
          ((inst.setProps as unknown) as (props: unknown) => {})({
            ...props,
            ...((propChanges as object) || {}),
            state: {
              ...props.state,
              ...((stateChanges as object) || {}),
            },
          });
          inst.update();
        });
      }

      return props.setState;
    }

    it('loads existence data', async () => {
      const setState = await testExistenceLoading();

      expect(setState).toHaveBeenCalledTimes(1);

      const nextState = setState.mock.calls[0][0]({
        existingFields: {},
      });

      expect(nextState.existingFields).toEqual({
        a_testtitle: {
          a_field_1: true,
          a_field_2: true,
        },
      });
    });

    it('loads existence data for current index pattern id', async () => {
      const setState = await testExistenceLoading({ currentIndexPatternId: 'b' });

      expect(setState).toHaveBeenCalledTimes(2);

      const nextState = setState.mock.calls[1][0]({
        existingFields: {},
      });

      expect(nextState.existingFields).toEqual({
        a_testtitle: {
          a_field_1: true,
          a_field_2: true,
        },
        b_testtitle: {
          b_field_1: true,
          b_field_2: true,
        },
      });
    });

    it('does not load existence data if date and index pattern ids are unchanged', async () => {
      const setState = await testExistenceLoading({
        currentIndexPatternId: 'a',
        dateRange: { fromDate: '2019-01-01', toDate: '2020-01-01' },
      });

      expect(setState).toHaveBeenCalledTimes(1);
    });

    it('loads existence data if date range changes', async () => {
      const setState = await testExistenceLoading(undefined, {
        dateRange: { fromDate: '2019-01-01', toDate: '2020-01-02' },
      });

      expect(setState).toHaveBeenCalledTimes(2);
      expect(core.http.post).toHaveBeenCalledTimes(2);

      expect(core.http.post).toHaveBeenCalledWith('/api/lens/existing_fields/a', {
        body: JSON.stringify({
          dslQuery,
          fromDate: '2019-01-01',
          toDate: '2020-01-01',
          timeFieldName: 'atime',
        }),
      });

      expect(core.http.post).toHaveBeenCalledWith('/api/lens/existing_fields/a', {
        body: JSON.stringify({
          dslQuery,
          fromDate: '2019-01-01',
          toDate: '2020-01-02',
          timeFieldName: 'atime',
        }),
      });

      const nextState = setState.mock.calls[1][0]({
        existingFields: {},
      });

      expect(nextState.existingFields).toEqual({
        a_testtitle: {
          a_field_1: true,
          a_field_2: true,
        },
      });
    });

    it('loads existence data if layer index pattern changes', async () => {
      const setState = await testExistenceLoading({
        layers: {
          1: {
            indexPatternId: 'b',
          },
        },
      });

      expect(setState).toHaveBeenCalledTimes(2);

      expect(core.http.post).toHaveBeenCalledWith('/api/lens/existing_fields/a', {
        body: JSON.stringify({
          dslQuery,
          fromDate: '2019-01-01',
          toDate: '2020-01-01',
          timeFieldName: 'atime',
        }),
      });

      expect(core.http.post).toHaveBeenCalledWith('/api/lens/existing_fields/b', {
        body: JSON.stringify({
          dslQuery,
          fromDate: '2019-01-01',
          toDate: '2020-01-01',
          timeFieldName: 'btime',
        }),
      });

      const nextState = setState.mock.calls[1][0]({
        existingFields: {},
      });

      expect(nextState.existingFields).toEqual({
        a_testtitle: {
          a_field_1: true,
          a_field_2: true,
        },
        b_testtitle: {
          b_field_1: true,
          b_field_2: true,
        },
      });
    });

    it('shows a loading indicator when loading', async () => {
      const load = async () => {};
      const inst = mountWithIntl(<IndexPatternDataPanel {...testProps()} />);
      expect(inst.find(EuiProgress).length).toEqual(1);
      await act(load);
      inst.update();
      expect(inst.find(EuiProgress).length).toEqual(0);
    });

    it('does not perform multiple queries at once', async () => {
      let queryCount = 0;
      let overlapCount = 0;
      const props = testProps();

      core.http.post.mockImplementation((path) => {
        if (queryCount) {
          ++overlapCount;
        }
        ++queryCount;

        const parts = ((path as unknown) as string).split('/');
        const indexPatternTitle = parts[parts.length - 1];
        const result = Promise.resolve({
          indexPatternTitle,
          existingFieldNames: ['field_1', 'field_2'].map(
            (fieldName) => `${indexPatternTitle}_${fieldName}`
          ),
        });

        result.then(() => --queryCount);

        return result;
      });

      const inst = mountWithIntl(<IndexPatternDataPanel {...props} />);

      inst.update();

      act(() => {
        ((inst.setProps as unknown) as (props: unknown) => {})({
          ...props,
          dateRange: { fromDate: '2019-01-01', toDate: '2020-01-02' },
        });
        inst.update();
      });

      await act(async () => {
        ((inst.setProps as unknown) as (props: unknown) => {})({
          ...props,
          dateRange: { fromDate: '2019-01-01', toDate: '2020-01-03' },
        });
        inst.update();
      });

      expect(core.http.post).toHaveBeenCalledTimes(2);
      expect(overlapCount).toEqual(0);
    });

    it("should default to empty dsl if query can't be parsed", async () => {
      const props = {
        ...testProps(),
        query: {
          language: 'kuery',
          query: '@timestamp : NOT *',
        },
      };
      await testExistenceLoading(undefined, undefined, props);

      expect((props.core.http.post as jest.Mock).mock.calls[0][1].body).toContain(
        JSON.stringify({
          must_not: {
            match_all: {},
          },
        })
      );
    });
  });

  describe('displaying field list', () => {
    let props: Parameters<typeof InnerIndexPatternDataPanel>[0];
    beforeEach(() => {
      props = {
        ...defaultProps,
        existingFields: {
          idx1: {
            bytes: true,
            memory: true,
          },
        },
      };
    });
    it('should list all supported fields in the pattern sorted alphabetically in groups', async () => {
      const wrapper = mountWithIntl(<InnerIndexPatternDataPanel {...props} />);
      expect(wrapper.find(FieldItem).first().prop('field').name).toEqual('Records');
      expect(
        wrapper
          .find('[data-test-subj="lnsIndexPatternAvailableFields"]')
          .find(FieldItem)
          .map((fieldItem) => fieldItem.prop('field').name)
      ).toEqual(['bytes', 'memory']);
      wrapper
        .find('[data-test-subj="lnsIndexPatternEmptyFields"]')
        .find('button')
        .first()
        .simulate('click');
      expect(
        wrapper
          .find('[data-test-subj="lnsIndexPatternEmptyFields"]')
          .find(FieldItem)
          .map((fieldItem) => fieldItem.prop('field').name)
      ).toEqual(['client', 'source', 'timestamp']);
    });

    it('should display NoFieldsCallout when all fields are empty', async () => {
      const wrapper = mountWithIntl(
        <InnerIndexPatternDataPanel {...defaultProps} existingFields={{ idx1: {} }} />
      );
      expect(wrapper.find(NoFieldsCallout).length).toEqual(1);
      expect(
        wrapper
          .find('[data-test-subj="lnsIndexPatternAvailableFields"]')
          .find(FieldItem)
          .map((fieldItem) => fieldItem.prop('field').name)
      ).toEqual([]);
      wrapper
        .find('[data-test-subj="lnsIndexPatternEmptyFields"]')
        .find('button')
        .first()
        .simulate('click');
      expect(
        wrapper
          .find('[data-test-subj="lnsIndexPatternEmptyFields"]')
          .find(FieldItem)
          .map((fieldItem) => fieldItem.prop('field').name)
      ).toEqual(['bytes', 'client', 'memory', 'source', 'timestamp']);
    });

    it('should display spinner for available fields accordion if existing fields are not loaded yet', async () => {
      const wrapper = mountWithIntl(<InnerIndexPatternDataPanel {...defaultProps} />);
      expect(
        wrapper.find('[data-test-subj="lnsIndexPatternAvailableFields"]').find(EuiLoadingSpinner)
          .length
      ).toEqual(1);
      wrapper.setProps({ existingFields: { idx1: {} } });
      expect(wrapper.find(NoFieldsCallout).length).toEqual(1);
    });

    it('should filter down by name', () => {
      const wrapper = mountWithIntl(<InnerIndexPatternDataPanel {...props} />);
      act(() => {
        wrapper.find('[data-test-subj="lnsIndexPatternFieldSearch"]').prop('onChange')!({
          target: { value: 'me' },
        } as ChangeEvent<HTMLInputElement>);
      });

      wrapper
        .find('[data-test-subj="lnsIndexPatternEmptyFields"]')
        .find('button')
        .first()
        .simulate('click');

      expect(wrapper.find(FieldItem).map((fieldItem) => fieldItem.prop('field').name)).toEqual([
        'memory',
        'timestamp',
      ]);
    });

    it('should filter down by type', () => {
      const wrapper = mountWithIntl(<InnerIndexPatternDataPanel {...props} />);

      wrapper.find('[data-test-subj="lnsIndexPatternFiltersToggle"]').first().simulate('click');

      wrapper.find('[data-test-subj="typeFilter-number"]').first().simulate('click');

      expect(wrapper.find(FieldItem).map((fieldItem) => fieldItem.prop('field').name)).toEqual([
        'bytes',
        'memory',
      ]);
    });

    it('should display no fields in groups when filtered by type Record', () => {
      const wrapper = mountWithIntl(<InnerIndexPatternDataPanel {...props} />);

      wrapper.find('[data-test-subj="lnsIndexPatternFiltersToggle"]').first().simulate('click');

      wrapper.find('[data-test-subj="typeFilter-document"]').first().simulate('click');

      expect(wrapper.find(FieldItem).map((fieldItem) => fieldItem.prop('field').name)).toEqual([
        'Records',
      ]);
      expect(wrapper.find(NoFieldsCallout).length).toEqual(2);
    });

    it('should toggle type if clicked again', () => {
      const wrapper = mountWithIntl(<InnerIndexPatternDataPanel {...props} />);
      wrapper.find('[data-test-subj="lnsIndexPatternFiltersToggle"]').first().simulate('click');

      wrapper.find('[data-test-subj="typeFilter-number"]').first().simulate('click');
      wrapper.find('[data-test-subj="typeFilter-number"]').first().simulate('click');
      wrapper
        .find('[data-test-subj="lnsIndexPatternEmptyFields"]')
        .find('button')
        .first()
        .simulate('click');
      expect(wrapper.find(FieldItem).map((fieldItem) => fieldItem.prop('field').name)).toEqual([
        'Records',
        'bytes',
        'memory',
        'client',
        'source',
        'timestamp',
      ]);
    });

    it('should filter down by type and by name', () => {
      const wrapper = mountWithIntl(<InnerIndexPatternDataPanel {...props} />);
      act(() => {
        wrapper.find('[data-test-subj="lnsIndexPatternFieldSearch"]').prop('onChange')!({
          target: { value: 'me' },
        } as ChangeEvent<HTMLInputElement>);
      });

      wrapper.find('[data-test-subj="lnsIndexPatternFiltersToggle"]').first().simulate('click');

      wrapper.find('[data-test-subj="typeFilter-number"]').first().simulate('click');

      expect(wrapper.find(FieldItem).map((fieldItem) => fieldItem.prop('field').name)).toEqual([
        'memory',
      ]);
    });
  });
});
