/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { createMockedDragDropContext } from './mocks';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import {
  dataViewPluginMocks,
  Start as DataViewPublicStart,
} from '@kbn/data-views-plugin/public/mocks';
import { InnerFormBasedDataPanel, FormBasedDataPanel, Props } from './datapanel';
import { FieldList } from './field_list';
import { FieldItem } from './field_item';
import { NoFieldsCallout } from './no_fields_callout';
import { act } from 'react-dom/test-utils';
import { coreMock } from '@kbn/core/public/mocks';
import { FormBasedPrivateState } from './types';
import { mountWithIntl, shallowWithIntl } from '@kbn/test-jest-helpers';
import { EuiProgress, EuiLoadingSpinner } from '@elastic/eui';
import { documentField } from './document_field';
import { chartPluginMock } from '@kbn/charts-plugin/public/mocks';
import { fieldFormatsServiceMock } from '@kbn/field-formats-plugin/public/mocks';
import { indexPatternFieldEditorPluginMock } from '@kbn/data-view-field-editor-plugin/public/mocks';
import { getFieldByNameFactory } from './pure_helpers';
import { uiActionsPluginMock } from '@kbn/ui-actions-plugin/public/mocks';
import { TermsIndexPatternColumn } from './operations';
import { DOCUMENT_FIELD_NAME } from '../../../common';
import { createIndexPatternServiceMock } from '../../mocks/data_views_service_mock';
import { createMockFramePublicAPI } from '../../mocks';
import { DataViewsState } from '../../state_management';
import { ExistingFieldsMap, FramePublicAPI, IndexPattern } from '../../types';
import { IndexPatternServiceProps } from '../../data_views_service/service';
import { FieldSpec, DataView } from '@kbn/data-views-plugin/public';
import { UI_SETTINGS } from '@kbn/data-plugin/public';

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

function getExistingFields(indexPatterns: Record<string, IndexPattern>) {
  const existingFields: ExistingFieldsMap = {};
  for (const { title, fields } of Object.values(indexPatterns)) {
    const fieldsMap: Record<string, boolean> = {};
    for (const { displayName, name } of fields) {
      fieldsMap[displayName ?? name] = true;
    }
    existingFields[title] = fieldsMap;
  }
  return existingFields;
}

const initialState: FormBasedPrivateState = {
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
};

function getFrameAPIMock({ indexPatterns, existingFields, ...rest }: Partial<DataViewsState> = {}) {
  const frameAPI = createMockFramePublicAPI();
  const defaultIndexPatterns = {
    '1': {
      id: '1',
      title: 'idx1',
      timeFieldName: 'timestamp',
      hasRestrictions: false,
      fields: fieldsOne,
      getFieldByName: getFieldByNameFactory(fieldsOne),
      isPersisted: true,
      spec: {},
    },
    '2': {
      id: '2',
      title: 'idx2',
      timeFieldName: 'timestamp',
      hasRestrictions: true,
      fields: fieldsTwo,
      getFieldByName: getFieldByNameFactory(fieldsTwo),
      isPersisted: true,
      spec: {},
    },
    '3': {
      id: '3',
      title: 'idx3',
      timeFieldName: 'timestamp',
      hasRestrictions: false,
      fields: fieldsThree,
      getFieldByName: getFieldByNameFactory(fieldsThree),
      isPersisted: true,
      spec: {},
    },
  };
  return {
    ...frameAPI,
    dataViews: {
      ...frameAPI.dataViews,
      indexPatterns: indexPatterns ?? defaultIndexPatterns,
      existingFields: existingFields ?? getExistingFields(indexPatterns ?? defaultIndexPatterns),
      isFirstExistenceFetch: false,
      ...rest,
    },
  };
}

const dslQuery = { bool: { must: [], filter: [], should: [], must_not: [] } };

// @ts-expect-error Portal mocks are notoriously difficult to type
ReactDOM.createPortal = jest.fn((element) => element);

describe('FormBased Data Panel', () => {
  const indexPatterns = {
    a: {
      id: 'a',
      title: 'aaa',
      timeFieldName: 'atime',
      fields: [{ name: 'aaa_field_1' }, { name: 'aaa_field_2' }],
      getFieldByName: getFieldByNameFactory([]),
      hasRestrictions: false,
    },
    b: {
      id: 'b',
      title: 'bbb',
      timeFieldName: 'btime',
      fields: [{ name: 'bbb_field_1' }, { name: 'bbb_field_2' }],
      getFieldByName: getFieldByNameFactory([]),
      hasRestrictions: false,
    },
  };
  let defaultProps: Parameters<typeof InnerFormBasedDataPanel>[0] & {
    showNoDataPopover: () => void;
  };
  let core: ReturnType<typeof coreMock['createStart']>;
  let dataViews: DataViewPublicStart;

  beforeEach(() => {
    core = coreMock.createStart();
    dataViews = dataViewPluginMocks.createStartContract();
    defaultProps = {
      data: dataPluginMock.createStartContract(),
      dataViews: dataViewPluginMocks.createStartContract(),
      fieldFormats: fieldFormatsServiceMock.createStartContract(),
      indexPatternFieldEditor: indexPatternFieldEditorPluginMock.createStartContract(),
      onIndexPatternRefresh: jest.fn(),
      dragDropContext: createMockedDragDropContext(),
      currentIndexPatternId: '1',
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
      indexPatternService: createIndexPatternServiceMock({ core, dataViews }),
      frame: getFrameAPIMock(),
    };
  });

  it('should render a warning if there are no index patterns', () => {
    const wrapper = shallowWithIntl(
      <FormBasedDataPanel
        {...defaultProps}
        state={{
          ...initialState,
          currentIndexPatternId: '',
        }}
        setState={jest.fn()}
        dragDropContext={{
          ...createMockedDragDropContext(),
          dragging: { id: '1', humanData: { label: 'Label' } },
        }}
        frame={createMockFramePublicAPI()}
      />
    );
    expect(wrapper.find('[data-test-subj="indexPattern-no-indexpatterns"]')).toHaveLength(1);
  });

  describe('loading existence data', () => {
    function testProps(updateIndexPatterns: IndexPatternServiceProps['updateIndexPatterns']) {
      core.uiSettings.get.mockImplementation((key: string) => {
        if (key === UI_SETTINGS.META_FIELDS) {
          return [];
        }
      });
      dataViews.getFieldsForIndexPattern.mockImplementation((dataView) => {
        return Promise.resolve([
          { name: `${dataView.title}_field_1` },
          { name: `${dataView.title}_field_2` },
        ]) as Promise<FieldSpec[]>;
      });
      dataViews.get.mockImplementation(async (id: string) => {
        return [indexPatterns.a, indexPatterns.b].find(
          (indexPattern) => indexPattern.id === id
        ) as unknown as DataView;
      });
      return {
        ...defaultProps,
        indexPatternService: createIndexPatternServiceMock({
          updateIndexPatterns,
          core,
          dataViews,
        }),
        setState: jest.fn(),
        dragDropContext: {
          ...createMockedDragDropContext(),
          dragging: { id: '1', humanData: { label: 'Label' } },
        },
        dateRange: { fromDate: '2019-01-01', toDate: '2020-01-01' },
        frame: {
          dataViews: {
            indexPatternRefs: [],
            existingFields: {},
            isFirstExistenceFetch: false,
            indexPatterns,
          },
        } as unknown as FramePublicAPI,
        state: {
          currentIndexPatternId: 'a',
          layers: {
            1: {
              indexPatternId: 'a',
              columnOrder: [],
              columns: {},
            },
          },
        } as FormBasedPrivateState,
      };
    }

    async function testExistenceLoading(
      props: Props,
      stateChanges?: Partial<FormBasedPrivateState>,
      propChanges?: Partial<Props>
    ) {
      const inst = mountWithIntl<Props>(<FormBasedDataPanel {...props} />);

      await act(async () => {
        inst.update();
      });

      if (stateChanges || propChanges) {
        await act(async () => {
          inst.setProps({
            ...props,
            ...(propChanges || {}),
            state: {
              ...props.state,
              ...(stateChanges || {}),
            },
          });
          inst.update();
        });
      }
    }

    it('loads existence data', async () => {
      const updateIndexPatterns = jest.fn();
      await testExistenceLoading(testProps(updateIndexPatterns));

      expect(updateIndexPatterns).toHaveBeenCalledWith(
        {
          existingFields: {
            aaa: {
              aaa_field_1: true,
              aaa_field_2: true,
            },
          },
          isFirstExistenceFetch: false,
        },
        { applyImmediately: true }
      );
    });

    it('loads existence data for current index pattern id', async () => {
      const updateIndexPatterns = jest.fn();
      await testExistenceLoading(testProps(updateIndexPatterns), {
        currentIndexPatternId: 'b',
      });

      expect(updateIndexPatterns).toHaveBeenCalledWith(
        {
          existingFields: {
            aaa: {
              aaa_field_1: true,
              aaa_field_2: true,
            },
            bbb: {
              bbb_field_1: true,
              bbb_field_2: true,
            },
          },
          isFirstExistenceFetch: false,
        },
        { applyImmediately: true }
      );
    });

    it('does not load existence data if date and index pattern ids are unchanged', async () => {
      const updateIndexPatterns = jest.fn();
      await testExistenceLoading(
        testProps(updateIndexPatterns),
        {
          currentIndexPatternId: 'a',
        },
        { dateRange: { fromDate: '2019-01-01', toDate: '2020-01-01' } }
      );

      expect(updateIndexPatterns).toHaveBeenCalledTimes(1);
    });

    it('loads existence data if date range changes', async () => {
      const updateIndexPatterns = jest.fn();
      await testExistenceLoading(testProps(updateIndexPatterns), undefined, {
        dateRange: { fromDate: '2019-01-01', toDate: '2020-01-02' },
      });

      expect(updateIndexPatterns).toHaveBeenCalledTimes(2);
      expect(dataViews.getFieldsForIndexPattern).toHaveBeenCalledTimes(2);
      expect(dataViews.get).toHaveBeenCalledTimes(2);

      const firstCall = dataViews.getFieldsForIndexPattern.mock.calls[0];
      expect(firstCall[0]).toEqual(indexPatterns.a);
      expect(firstCall[1]?.filter?.bool?.filter).toContainEqual(dslQuery);
      expect(firstCall[1]?.filter?.bool?.filter).toContainEqual({
        range: {
          atime: {
            format: 'strict_date_optional_time',
            gte: '2019-01-01',
            lte: '2020-01-01',
          },
        },
      });

      const secondCall = dataViews.getFieldsForIndexPattern.mock.calls[1];
      expect(secondCall[0]).toEqual(indexPatterns.a);
      expect(secondCall[1]?.filter?.bool?.filter).toContainEqual(dslQuery);
      expect(secondCall[1]?.filter?.bool?.filter).toContainEqual({
        range: {
          atime: {
            format: 'strict_date_optional_time',
            gte: '2019-01-01',
            lte: '2020-01-02',
          },
        },
      });

      expect(updateIndexPatterns).toHaveBeenCalledWith(
        {
          existingFields: {
            aaa: {
              aaa_field_1: true,
              aaa_field_2: true,
            },
          },
          isFirstExistenceFetch: false,
        },
        { applyImmediately: true }
      );
    });

    it('loads existence data if layer index pattern changes', async () => {
      const updateIndexPatterns = jest.fn();
      await testExistenceLoading(testProps(updateIndexPatterns), {
        layers: {
          1: {
            indexPatternId: 'b',
            columnOrder: [],
            columns: {},
          },
        },
      });

      expect(updateIndexPatterns).toHaveBeenCalledTimes(2);

      const secondCall = dataViews.getFieldsForIndexPattern.mock.calls[1];
      expect(secondCall[0]).toEqual(indexPatterns.a);
      expect(secondCall[1]?.filter?.bool?.filter).toContainEqual(dslQuery);
      expect(secondCall[1]?.filter?.bool?.filter).toContainEqual({
        range: {
          atime: {
            format: 'strict_date_optional_time',
            gte: '2019-01-01',
            lte: '2020-01-01',
          },
        },
      });

      const thirdCall = dataViews.getFieldsForIndexPattern.mock.calls[2];
      expect(thirdCall[0]).toEqual(indexPatterns.b);
      expect(thirdCall[1]?.filter?.bool?.filter).toContainEqual(dslQuery);
      expect(thirdCall[1]?.filter?.bool?.filter).toContainEqual({
        range: {
          btime: {
            format: 'strict_date_optional_time',
            gte: '2019-01-01',
            lte: '2020-01-01',
          },
        },
      });

      expect(updateIndexPatterns).toHaveBeenCalledWith(
        {
          existingFields: {
            aaa: {
              aaa_field_1: true,
              aaa_field_2: true,
            },
            bbb: {
              bbb_field_1: true,
              bbb_field_2: true,
            },
          },
          isFirstExistenceFetch: false,
        },
        { applyImmediately: true }
      );
    });

    it('shows a loading indicator when loading', async () => {
      const updateIndexPatterns = jest.fn();
      const load = async () => {};
      const inst = mountWithIntl(<FormBasedDataPanel {...testProps(updateIndexPatterns)} />);
      expect(inst.find(EuiProgress).length).toEqual(1);
      await act(load);
      inst.update();
      expect(inst.find(EuiProgress).length).toEqual(0);
    });

    it('does not perform multiple queries at once', async () => {
      const updateIndexPatterns = jest.fn();
      let queryCount = 0;
      let overlapCount = 0;
      const props = testProps(updateIndexPatterns);

      dataViews.getFieldsForIndexPattern.mockImplementation((dataView) => {
        if (queryCount) {
          ++overlapCount;
        }
        ++queryCount;
        const result = Promise.resolve([
          { name: `${dataView.title}_field_1` },
          { name: `${dataView.title}_field_2` },
        ]) as Promise<FieldSpec[]>;

        result.then(() => --queryCount);

        return result;
      });

      const inst = mountWithIntl(<FormBasedDataPanel {...props} />);

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

      expect(dataViews.getFieldsForIndexPattern).toHaveBeenCalledTimes(2);
      expect(overlapCount).toEqual(0);
    });

    it("should default to empty dsl if query can't be parsed", async () => {
      const updateIndexPatterns = jest.fn();
      const props = {
        ...testProps(updateIndexPatterns),
        query: {
          language: 'kuery',
          query: '@timestamp : NOT *',
        },
      };
      await testExistenceLoading(props, undefined, undefined);

      const firstCall = dataViews.getFieldsForIndexPattern.mock.calls[0];
      expect(firstCall[1]?.filter?.bool?.filter).toContainEqual({
        bool: {
          must_not: {
            match_all: {},
          },
        },
      });
    });
  });

  describe('displaying field list', () => {
    let props: Parameters<typeof InnerFormBasedDataPanel>[0];
    beforeEach(() => {
      props = {
        ...defaultProps,
        frame: getFrameAPIMock({
          existingFields: {
            idx1: {
              bytes: true,
              memory: true,
            },
          },
        }),
      };
    });

    it('should list all selected fields if exist', async () => {
      const newProps = {
        ...props,
        layerFields: ['bytes'],
      };
      const wrapper = mountWithIntl(<InnerFormBasedDataPanel {...newProps} />);
      expect(
        wrapper
          .find('[data-test-subj="lnsIndexPatternSelectedFields"]')
          .find(FieldItem)
          .map((fieldItem) => fieldItem.prop('field').name)
      ).toEqual(['bytes']);
    });

    it('should not list the selected fields accordion if no fields given', async () => {
      const wrapper = mountWithIntl(<InnerFormBasedDataPanel {...props} />);
      expect(
        wrapper
          .find('[data-test-subj="lnsIndexPatternSelectedFields"]')
          .find(FieldItem)
          .map((fieldItem) => fieldItem.prop('field').name)
      ).toEqual([]);
    });

    it('should list all supported fields in the pattern sorted alphabetically in groups', async () => {
      const wrapper = mountWithIntl(<InnerFormBasedDataPanel {...props} />);
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
        <InnerFormBasedDataPanel
          {...props}
          frame={getFrameAPIMock({
            indexPatterns: {
              '1': {
                ...props.frame.dataViews.indexPatterns['1'],
                fields: [
                  ...props.frame.dataViews.indexPatterns['1'].fields,
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
            },
          })}
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
        <InnerFormBasedDataPanel
          {...defaultProps}
          frame={getFrameAPIMock({ existingFields: { idx1: {} } })}
        />
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
      const wrapper = mountWithIntl(
        <InnerFormBasedDataPanel
          {...defaultProps}
          frame={getFrameAPIMock({ existingFields: {} })}
        />
      );
      expect(
        wrapper.find('[data-test-subj="lnsIndexPatternAvailableFields"]').find(EuiLoadingSpinner)
          .length
      ).toEqual(1);
      wrapper.setProps({ frame: getFrameAPIMock({ existingFields: { idx1: {} } }) });
      expect(wrapper.find(NoFieldsCallout).length).toEqual(2);
    });

    it('should not allow field details when error', () => {
      const wrapper = mountWithIntl(
        <InnerFormBasedDataPanel
          {...props}
          frame={getFrameAPIMock({ existenceFetchFailed: true })}
        />
      );

      expect(wrapper.find(FieldList).prop('fieldGroups')).toEqual(
        expect.objectContaining({
          AvailableFields: expect.objectContaining({ hideDetails: true }),
        })
      );
    });

    it('should allow field details when timeout', () => {
      const wrapper = mountWithIntl(
        <InnerFormBasedDataPanel
          {...props}
          frame={getFrameAPIMock({ existenceFetchTimeout: true })}
        />
      );

      expect(wrapper.find(FieldList).prop('fieldGroups')).toEqual(
        expect.objectContaining({
          AvailableFields: expect.objectContaining({ hideDetails: false }),
        })
      );
    });

    it('should filter down by name', () => {
      const wrapper = mountWithIntl(<InnerFormBasedDataPanel {...props} />);
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
      const wrapper = mountWithIntl(<InnerFormBasedDataPanel {...props} />);
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

      expect(wrapper.find('[aria-live="polite"]').at(1).text()).toEqual(
        '1 available field. 1 empty field. 0 meta fields.'
      );
    });

    it('should filter down by type', () => {
      const wrapper = mountWithIntl(<InnerFormBasedDataPanel {...props} />);

      wrapper.find('[data-test-subj="lnsIndexPatternFiltersToggle"]').first().simulate('click');

      wrapper.find('[data-test-subj="typeFilter-number"]').first().simulate('click');

      expect(
        wrapper.find(FieldItem).map((fieldItem) => fieldItem.prop('field').displayName)
      ).toEqual(['amemory', 'bytes']);
    });

    it('should display no fields in groups when filtered by type Record', () => {
      const wrapper = mountWithIntl(<InnerFormBasedDataPanel {...props} />);

      wrapper.find('[data-test-subj="lnsIndexPatternFiltersToggle"]').first().simulate('click');

      wrapper.find('[data-test-subj="typeFilter-document"]').first().simulate('click');

      expect(wrapper.find(FieldItem).map((fieldItem) => fieldItem.prop('field').name)).toEqual([
        DOCUMENT_FIELD_NAME,
      ]);
      expect(wrapper.find(NoFieldsCallout).length).toEqual(3);
    });

    it('should toggle type if clicked again', () => {
      const wrapper = mountWithIntl(<InnerFormBasedDataPanel {...props} />);
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
      const wrapper = mountWithIntl(<InnerFormBasedDataPanel {...props} />);
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
  });
});
