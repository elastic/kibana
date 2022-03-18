/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { waitFor } from '@testing-library/react';
import ReactDOM from 'react-dom';
import { createMockedDragDropContext } from './mocks';
import { dataPluginMock } from '../../../../../src/plugins/data/public/mocks';
import { dataViewPluginMocks } from '../../../../../src/plugins/data_views/public/mocks';
import { InnerIndexPatternDataPanel, IndexPatternDataPanel, MemoizedDataPanel } from './datapanel';
import { FieldList } from './field_list';
import { FieldItem } from './field_item';
import { NoFieldsCallout } from './no_fields_callout';
import { act } from 'react-dom/test-utils';
import { coreMock } from 'src/core/public/mocks';
import { IndexPatternPrivateState } from './types';
import { mountWithIntl, shallowWithIntl } from '@kbn/test-jest-helpers';
import { ChangeIndexPattern } from './change_indexpattern';
import { EuiProgress, EuiLoadingSpinner } from '@elastic/eui';
import { documentField } from './document_field';
import { chartPluginMock } from '../../../../../src/plugins/charts/public/mocks';
import { fieldFormatsServiceMock } from '../../../../../src/plugins/field_formats/public/mocks';
import { indexPatternFieldEditorPluginMock } from '../../../../../src/plugins/data_view_field_editor/public/mocks';
import { getFieldByNameFactory } from './pure_helpers';
import { uiActionsPluginMock } from '../../../../../src/plugins/ui_actions/public/mocks';
import { TermsIndexPatternColumn } from './operations';
import { DOCUMENT_FIELD_NAME } from '../../common';

const fieldsOne = [
  {
    name: 'timestamp',
    displayName: 'timestampLabel',
    type: 'date',
    aggregatable: true,
    searchable: true,
  },
  {
    name: 'bytes',
    displayName: 'bytes',
    type: 'number',
    aggregatable: true,
    searchable: true,
  },
  {
    name: 'memory',
    displayName: 'amemory',
    type: 'number',
    aggregatable: true,
    searchable: true,
  },
  {
    name: 'unsupported',
    displayName: 'unsupported',
    type: 'geo',
    aggregatable: true,
    searchable: true,
  },
  {
    name: 'source',
    displayName: 'source',
    type: 'string',
    aggregatable: true,
    searchable: true,
  },
  {
    name: 'client',
    displayName: 'client',
    type: 'ip',
    aggregatable: true,
    searchable: true,
  },
  documentField,
];

const fieldsTwo = [
  {
    name: 'timestamp',
    displayName: 'timestampLabel',
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
    displayName: 'bytes',
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
    displayName: 'source',
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
];

const fieldsThree = [
  {
    name: 'timestamp',
    displayName: 'timestampLabel',
    type: 'date',
    aggregatable: true,
    searchable: true,
  },
  {
    name: 'bytes',
    displayName: 'bytes',
    type: 'number',
    aggregatable: true,
    searchable: true,
  },
  {
    name: 'source',
    displayName: 'source',
    type: 'string',
    aggregatable: true,
    searchable: true,
  },
  documentField,
];

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
        } as TermsIndexPatternColumn,
        col2: {
          label: 'My Op',
          dataType: 'number',
          isBucketed: false,
          operationType: 'average',
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
        } as TermsIndexPatternColumn,
        col2: {
          label: 'My Op',
          dataType: 'number',
          isBucketed: false,
          operationType: 'average',
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
      hasRestrictions: false,
      fields: fieldsOne,
      getFieldByName: getFieldByNameFactory(fieldsOne),
    },
    '2': {
      id: '2',
      title: 'idx2',
      timeFieldName: 'timestamp',
      hasRestrictions: true,
      fields: fieldsTwo,
      getFieldByName: getFieldByNameFactory(fieldsTwo),
    },
    '3': {
      id: '3',
      title: 'idx3',
      timeFieldName: 'timestamp',
      hasRestrictions: false,
      fields: fieldsThree,
      getFieldByName: getFieldByNameFactory(fieldsThree),
    },
  },
  isFirstExistenceFetch: false,
};

const dslQuery = { bool: { must: [], filter: [], should: [], must_not: [] } };

// @ts-expect-error Portal mocks are notoriously difficult to type
ReactDOM.createPortal = jest.fn((element) => element);

describe('IndexPattern Data Panel', () => {
  let defaultProps: Parameters<typeof InnerIndexPatternDataPanel>[0] & {
    showNoDataPopover: () => void;
  };
  let core: ReturnType<typeof coreMock['createStart']>;

  beforeEach(() => {
    core = coreMock.createStart();
    defaultProps = {
      indexPatternRefs: [],
      existingFields: {},
      data: dataPluginMock.createStartContract(),
      dataViews: dataViewPluginMocks.createStartContract(),
      fieldFormats: fieldFormatsServiceMock.createStartContract(),
      indexPatternFieldEditor: indexPatternFieldEditorPluginMock.createStartContract(),
      onUpdateIndexPattern: jest.fn(),
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
      dropOntoWorkspace: jest.fn(),
      hasSuggestionForField: jest.fn(() => false),
      uiActions: uiActionsPluginMock.createStartContract(),
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
        dragDropContext={{
          ...createMockedDragDropContext(),
          dragging: { id: '1', humanData: { label: 'Label' } },
        }}
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
        dragDropContext={{
          ...createMockedDragDropContext(),
          dragging: { id: '1', humanData: { label: 'Label' } },
        }}
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
        const parts = (path as unknown as string).split('/');
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
        dragDropContext: {
          ...createMockedDragDropContext(),
          dragging: { id: '1', humanData: { label: 'Label' } },
        },
        dateRange: { fromDate: '2019-01-01', toDate: '2020-01-01' },
        state: {
          indexPatternRefs: [],
          existingFields: {},
          isFirstExistenceFetch: false,
          currentIndexPatternId: 'a',
          indexPatterns: {
            a: {
              id: 'a',
              title: 'aaa',
              timeFieldName: 'atime',
              fields: [],
              getFieldByName: getFieldByNameFactory([]),
              hasRestrictions: false,
            },
            b: {
              id: 'b',
              title: 'bbb',
              timeFieldName: 'btime',
              fields: [],
              getFieldByName: getFieldByNameFactory([]),
              hasRestrictions: false,
            },
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
          (inst.setProps as unknown as (props: unknown) => {})({
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

        const parts = (path as unknown as string).split('/');
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
        (inst.setProps as unknown as (props: unknown) => {})({
          ...props,
          dateRange: { fromDate: '2019-01-01', toDate: '2020-01-02' },
        });
        inst.update();
      });

      await act(async () => {
        (inst.setProps as unknown as (props: unknown) => {})({
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
      expect(wrapper.find(FieldItem).first().prop('field').displayName).toEqual('Records');
      expect(
        wrapper
          .find('[data-test-subj="lnsIndexPatternAvailableFields"]')
          .find(FieldItem)
          .map((fieldItem) => fieldItem.prop('field').name)
      ).toEqual(['memory', 'bytes']);
      wrapper
        .find('[data-test-subj="lnsIndexPatternEmptyFields"]')
        .find('button')
        .first()
        .simulate('click');
      const emptyAccordion = wrapper.find('[data-test-subj="lnsIndexPatternEmptyFields"]');
      expect(
        emptyAccordion.find(FieldItem).map((fieldItem) => fieldItem.prop('field').name)
      ).toEqual(['client', 'source', 'timestamp']);
      expect(
        emptyAccordion.find(FieldItem).map((fieldItem) => fieldItem.prop('field').displayName)
      ).toEqual(['client', 'source', 'timestampLabel']);
    });

    it('should show meta fields accordion', async () => {
      const wrapper = mountWithIntl(
        <InnerIndexPatternDataPanel
          {...props}
          indexPatterns={{
            '1': {
              ...props.indexPatterns['1'],
              fields: [
                ...props.indexPatterns['1'].fields,
                {
                  name: '_id',
                  displayName: '_id',
                  meta: true,
                  type: 'string',
                  searchable: true,
                  aggregatable: true,
                },
              ],
            },
          }}
        />
      );
      wrapper
        .find('[data-test-subj="lnsIndexPatternMetaFields"]')
        .find('button')
        .first()
        .simulate('click');
      expect(
        wrapper
          .find('[data-test-subj="lnsIndexPatternMetaFields"]')
          .find(FieldItem)
          .first()
          .prop('field').name
      ).toEqual('_id');
    });

    it('should display NoFieldsCallout when all fields are empty', async () => {
      const wrapper = mountWithIntl(
        <InnerIndexPatternDataPanel {...defaultProps} existingFields={{ idx1: {} }} />
      );
      expect(wrapper.find(NoFieldsCallout).length).toEqual(2);
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
          .map((fieldItem) => fieldItem.prop('field').displayName)
      ).toEqual(['amemory', 'bytes', 'client', 'source', 'timestampLabel']);
    });

    it('should display spinner for available fields accordion if existing fields are not loaded yet', async () => {
      const wrapper = mountWithIntl(<InnerIndexPatternDataPanel {...defaultProps} />);
      expect(
        wrapper.find('[data-test-subj="lnsIndexPatternAvailableFields"]').find(EuiLoadingSpinner)
          .length
      ).toEqual(1);
      wrapper.setProps({ existingFields: { idx1: {} } });
      expect(wrapper.find(NoFieldsCallout).length).toEqual(2);
    });

    it('should not allow field details when error', () => {
      const wrapper = mountWithIntl(
        <InnerIndexPatternDataPanel {...props} existenceFetchFailed={true} />
      );

      expect(wrapper.find(FieldList).prop('fieldGroups')).toEqual(
        expect.objectContaining({
          AvailableFields: expect.objectContaining({ hideDetails: true }),
        })
      );
    });

    it('should allow field details when timeout', () => {
      const wrapper = mountWithIntl(
        <InnerIndexPatternDataPanel {...props} existenceFetchTimeout={true} />
      );

      expect(wrapper.find(FieldList).prop('fieldGroups')).toEqual(
        expect.objectContaining({
          AvailableFields: expect.objectContaining({ hideDetails: false }),
        })
      );
    });

    it('should filter down by name', () => {
      const wrapper = mountWithIntl(<InnerIndexPatternDataPanel {...props} />);
      act(() => {
        wrapper.find('[data-test-subj="lnsIndexPatternFieldSearch"]').simulate('change', {
          target: { value: 'me' },
        });
      });

      wrapper
        .find('[data-test-subj="lnsIndexPatternEmptyFields"] button')
        .first()
        .simulate('click');

      expect(wrapper.find(FieldItem).map((fieldItem) => fieldItem.prop('field').name)).toEqual([
        'memory',
        'timestamp',
      ]);
    });

    it('should announce filter in live region', () => {
      const wrapper = mountWithIntl(<InnerIndexPatternDataPanel {...props} />);
      act(() => {
        wrapper.find('[data-test-subj="lnsIndexPatternFieldSearch"]').simulate('change', {
          target: { value: 'me' },
        });
      });

      wrapper
        .find('[data-test-subj="lnsIndexPatternEmptyFields"]')
        .find('button')
        .first()
        .simulate('click');

      expect(wrapper.find('[aria-live="polite"]').text()).toEqual(
        '1 available field. 1 empty field. 0 meta fields.'
      );
    });

    it('should filter down by type', () => {
      const wrapper = mountWithIntl(<InnerIndexPatternDataPanel {...props} />);

      wrapper.find('[data-test-subj="lnsIndexPatternFiltersToggle"]').first().simulate('click');

      wrapper.find('[data-test-subj="typeFilter-number"]').first().simulate('click');

      expect(
        wrapper.find(FieldItem).map((fieldItem) => fieldItem.prop('field').displayName)
      ).toEqual(['amemory', 'bytes']);
    });

    it('should display no fields in groups when filtered by type Record', () => {
      const wrapper = mountWithIntl(<InnerIndexPatternDataPanel {...props} />);

      wrapper.find('[data-test-subj="lnsIndexPatternFiltersToggle"]').first().simulate('click');

      wrapper.find('[data-test-subj="typeFilter-document"]').first().simulate('click');

      expect(wrapper.find(FieldItem).map((fieldItem) => fieldItem.prop('field').name)).toEqual([
        DOCUMENT_FIELD_NAME,
      ]);
      expect(wrapper.find(NoFieldsCallout).length).toEqual(3);
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
      expect(
        wrapper.find(FieldItem).map((fieldItem) => fieldItem.prop('field').displayName)
      ).toEqual(['Records', 'amemory', 'bytes', 'client', 'source', 'timestampLabel']);
    });

    it('should filter down by type and by name', () => {
      const wrapper = mountWithIntl(<InnerIndexPatternDataPanel {...props} />);
      act(() => {
        wrapper.find('[data-test-subj="lnsIndexPatternFieldSearch"]').simulate('change', {
          target: { value: 'me' },
        });
      });

      wrapper.find('[data-test-subj="lnsIndexPatternFiltersToggle"]').first().simulate('click');

      wrapper.find('[data-test-subj="typeFilter-number"]').first().simulate('click');

      expect(wrapper.find(FieldItem).map((fieldItem) => fieldItem.prop('field').name)).toEqual([
        'memory',
      ]);
    });
    describe('edit field list', () => {
      beforeEach(() => {
        props.indexPatternFieldEditor.userPermissions.editIndexPattern = () => true;
      });
      it('should call field editor plugin on clicking add button', async () => {
        const mockIndexPattern = {};
        (props.dataViews.get as jest.Mock).mockImplementation(() =>
          Promise.resolve(mockIndexPattern)
        );
        const wrapper = mountWithIntl(<InnerIndexPatternDataPanel {...props} />);
        act(() => {
          const popoverTrigger = wrapper.find(
            '[data-test-subj="lnsIndexPatternActions-popover"] button'
          );
          popoverTrigger.simulate('click');
        });

        wrapper.update();
        act(() => {
          wrapper.find('[data-test-subj="indexPattern-add-field"]').first().simulate('click');
        });
        // wait for indx pattern to be loaded
        await waitFor(() => {
          expect(props.indexPatternFieldEditor.openEditor).toHaveBeenCalledWith(
            expect.objectContaining({
              ctx: expect.objectContaining({
                dataView: mockIndexPattern,
              }),
            })
          );
        });
      });

      it('should reload index pattern if callback gets called', async () => {
        const mockIndexPattern = {
          id: '1',
          fields: [
            {
              name: 'fieldOne',
              aggregatable: true,
            },
          ],
          metaFields: [],
        };
        (props.dataViews.get as jest.Mock).mockImplementation(() =>
          Promise.resolve(mockIndexPattern)
        );
        const wrapper = mountWithIntl(<InnerIndexPatternDataPanel {...props} />);

        act(() => {
          const popoverTrigger = wrapper.find(
            '[data-test-subj="lnsIndexPatternActions-popover"] button'
          );
          popoverTrigger.simulate('click');
        });

        wrapper.update();
        act(() => {
          wrapper.find('[data-test-subj="indexPattern-add-field"]').first().simulate('click');
        });

        // wait for indx pattern to be loaded
        await act(async () => await new Promise((r) => setTimeout(r, 0)));

        await (props.indexPatternFieldEditor.openEditor as jest.Mock).mock.calls[0][0].onSave();
        // wait for indx pattern to be loaded
        await act(async () => await new Promise((r) => setTimeout(r, 0)));
        expect(props.onUpdateIndexPattern).toHaveBeenCalledWith(
          expect.objectContaining({
            fields: [
              expect.objectContaining({
                name: 'fieldOne',
              }),
              expect.anything(),
            ],
          })
        );
      });

      it('should not render add button without permissions', () => {
        props.indexPatternFieldEditor.userPermissions.editIndexPattern = () => false;
        const wrapper = mountWithIntl(<InnerIndexPatternDataPanel {...props} />);
        expect(wrapper.find('[data-test-subj="indexPattern-add-field"]').exists()).toBe(false);
      });
    });
  });
});
