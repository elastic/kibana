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
import { IndexPatternDataPanel, InnerIndexPatternDataPanel, Props } from './datapanel';
import {
  FieldList,
  ExistenceFetchStatus,
  type ExistingFieldsReader,
} from '@kbn/unified-field-list-plugin/public';
import * as UseExistingFieldsApi from '@kbn/unified-field-list-plugin/public/hooks/use_existing_fields';
import * as ExistingFieldsServiceApi from '@kbn/unified-field-list-plugin/public/services/field_existing/load_field_existing';
import { FieldItem } from './field_item';
import { act } from 'react-dom/test-utils';
import { coreMock } from '@kbn/core/public/mocks';
import { IndexPatternPrivateState } from './types';
import { mountWithIntl, shallowWithIntl } from '@kbn/test-jest-helpers';
import { EuiCallOut, EuiLoadingSpinner, EuiProgress } from '@elastic/eui';
import { documentField } from './document_field';
import { chartPluginMock } from '@kbn/charts-plugin/public/mocks';
import { fieldFormatsServiceMock } from '@kbn/field-formats-plugin/public/mocks';
import { indexPatternFieldEditorPluginMock } from '@kbn/data-view-field-editor-plugin/public/mocks';
import { getFieldByNameFactory } from './pure_helpers';
import { uiActionsPluginMock } from '@kbn/ui-actions-plugin/public/mocks';
import { TermsIndexPatternColumn } from './operations';
import { DOCUMENT_FIELD_NAME } from '../../common';
import { createIndexPatternServiceMock } from '../mocks/data_views_service_mock';
import { createMockFramePublicAPI } from '../mocks';
import { DataViewsState } from '../state_management';
import { IndexPattern } from '../types';
import { DataView, FieldSpec } from '@kbn/data-views-plugin/public';
import { UI_SETTINGS } from '@kbn/data-plugin/public';
import { ReactWrapper } from 'enzyme';

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

type MockExistingFieldsByDataView = Record<string, Record<string, boolean>>;

function getExistingFieldsMock(indexPatterns: Record<string, IndexPattern>) {
  const fieldsByDataViewMap: MockExistingFieldsByDataView = {};
  for (const { id, fields } of Object.values(indexPatterns)) {
    const fieldsMap: Record<string, boolean> = {};
    for (const { displayName, name } of fields) {
      fieldsMap[displayName ?? name] = true;
    }
    fieldsByDataViewMap[id] = fieldsMap;
  }
  return jest.fn(
    (): ExistingFieldsReader => ({
      hasFieldData: (dataViewId, fieldName) => Boolean(fieldsByDataViewMap[dataViewId][fieldName]),
      getFieldsExistenceStatus: (dataViewId) => ExistenceFetchStatus.succeeded,
    })
  );
}

function getCustomExistingFieldsMock(fieldsByDataViewMap: MockExistingFieldsByDataView = {}) {
  return jest.fn(
    (): ExistingFieldsReader => ({
      hasFieldData: (dataViewId, fieldName) => Boolean(fieldsByDataViewMap[dataViewId][fieldName]),
      getFieldsExistenceStatus: (dataViewId) =>
        dataViewId in fieldsByDataViewMap
          ? ExistenceFetchStatus.succeeded
          : ExistenceFetchStatus.unknown,
    })
  );
}

const originalUseExistingFieldsFetcher = UseExistingFieldsApi.useExistingFieldsFetcher;

jest.spyOn(UseExistingFieldsApi, 'useExistingFieldsReader').mockImplementation(() => ({
  hasFieldData: () => false,
  getFieldsExistenceStatus: () => ExistenceFetchStatus.unknown,
}));

jest.spyOn(UseExistingFieldsApi, 'useExistingFieldsFetcher').mockImplementation(() => ({
  refetchFieldsExistenceInfo: jest.fn(),
}));

jest.spyOn(ExistingFieldsServiceApi, 'loadFieldExisting').mockImplementation(async () => ({
  indexPatternTitle: 'test',
  existingFieldNames: fieldsOne.map((field) => field.name),
}));

const initialState: IndexPatternPrivateState = {
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

function getFrameAPIMock({
  indexPatterns,
  existingFields,
  ...rest
}: Partial<DataViewsState> & { existingFields?: MockExistingFieldsByDataView } = {}) {
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

  (UseExistingFieldsApi.useExistingFieldsReader as jest.Mock).mockImplementation(
    existingFields
      ? getCustomExistingFieldsMock(existingFields)
      : getExistingFieldsMock(indexPatterns ?? defaultIndexPatterns)
  );

  (UseExistingFieldsApi.useExistingFieldsFetcher as jest.Mock).mockImplementation(() => ({
    refetchFieldsExistenceInfo: jest.fn(),
  }));

  return {
    ...frameAPI,
    dataViews: {
      ...frameAPI.dataViews,
      indexPatterns: indexPatterns ?? defaultIndexPatterns,
      ...rest,
    },
  };
}

const dslQuery = { bool: { must: [], filter: [], should: [], must_not: [] } };

// @ts-expect-error Portal mocks are notoriously difficult to type
ReactDOM.createPortal = jest.fn((element) => element);

describe('IndexPattern Data Panel', () => {
  const indexPatterns = {
    a: {
      id: 'a',
      title: 'aaa',
      timeFieldName: 'atime',
      fields: fieldsOne,
      getFieldByName: getFieldByNameFactory(fieldsOne),
      hasRestrictions: false,
      isPersisted: true,
      spec: {},
    },
    b: {
      id: 'b',
      title: 'bbb',
      timeFieldName: 'btime',
      fields: fieldsTwo,
      getFieldByName: getFieldByNameFactory(fieldsTwo),
      hasRestrictions: false,
      isPersisted: true,
      spec: {},
    },
  };
  let defaultProps: Parameters<typeof InnerIndexPatternDataPanel>[0] & {
    showNoDataPopover: () => void;
  };
  let core: ReturnType<typeof coreMock['createStart']>;
  let dataViews: DataViewPublicStart;

  beforeEach(() => {
    core = coreMock.createStart();
    dataViews = dataViewPluginMocks.createStartContract();
    const frame = getFrameAPIMock();
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
      frame,
      activeIndexPatterns: [frame.dataViews.indexPatterns['1']],
    };
  });

  it('should render a warning if there are no index patterns', () => {
    const wrapper = shallowWithIntl(
      <IndexPatternDataPanel
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
    function testProps({
      currentIndexPatternId,
      existingFieldsByDataViewMap,
      otherProps,
    }: {
      currentIndexPatternId: keyof typeof indexPatterns;
      existingFieldsByDataViewMap?: MockExistingFieldsByDataView;
      otherProps?: object;
    }) {
      core.uiSettings.get.mockImplementation((key: string) => {
        if (key === UI_SETTINGS.META_FIELDS) {
          return [];
        }
      });
      dataViews.getFieldsForIndexPattern.mockImplementation((dataView) => {
        return Promise.resolve(dataView.fields) as Promise<FieldSpec[]>;
      });
      dataViews.get.mockImplementation(async (id: string) => {
        return [indexPatterns.a, indexPatterns.b].find(
          (indexPattern) => indexPattern.id === id
        ) as unknown as DataView;
      });
      return {
        ...defaultProps,
        indexPatternService: createIndexPatternServiceMock({
          updateIndexPatterns: jest.fn(),
          core,
          dataViews,
        }),
        setState: jest.fn(),
        dragDropContext: {
          ...createMockedDragDropContext(),
          dragging: { id: '1', humanData: { label: 'Label' } },
        },
        dateRange: { fromDate: '2019-01-01', toDate: '2020-01-01' },
        frame: getFrameAPIMock({
          indexPatterns: indexPatterns as unknown as DataViewsState['indexPatterns'],
          existingFields: existingFieldsByDataViewMap ?? {},
        }),
        activeIndexPatterns: [indexPatterns[currentIndexPatternId]],
        state: {
          currentIndexPatternId,
          layers: {
            1: {
              indexPatternId: currentIndexPatternId,
              columnOrder: [],
              columns: {},
            },
          },
        } as IndexPatternPrivateState,
        ...(otherProps || {}),
      };
    }

    it('loads existence data', async () => {
      const props = testProps({
        currentIndexPatternId: 'a',
        existingFieldsByDataViewMap: {
          a: {
            [indexPatterns.a.fields[0].name]: true,
            [indexPatterns.a.fields[1].name]: true,
          },
        },
      });
      const inst = mountWithIntl<Props>(<IndexPatternDataPanel {...props} />);

      expect(UseExistingFieldsApi.useExistingFieldsFetcher).toHaveBeenCalledWith(
        expect.objectContaining({
          dataViews: props.activeIndexPatterns,
          query: props.query,
          filters: props.filters,
          fromDate: props.dateRange.fromDate,
          toDate: props.dateRange.toDate,
        })
      );
      expect(UseExistingFieldsApi.useExistingFieldsReader).toHaveBeenCalled();
      expect(
        inst.find('[data-test-subj="unifiedFieldList__fieldListGroupedDescription"]').first().text()
      ).toBe('2 available fields. 3 empty fields. 0 meta fields.');
    });

    it('loads existence data for current index pattern id', async () => {
      const props = testProps({
        currentIndexPatternId: 'b',
        existingFieldsByDataViewMap: {
          a: {
            [indexPatterns.a.fields[0].name]: true,
            [indexPatterns.a.fields[1].name]: true,
          },
          b: {
            [indexPatterns.b.fields[0].name]: true,
          },
        },
      });
      const inst = mountWithIntl<Props>(<IndexPatternDataPanel {...props} />);

      expect(UseExistingFieldsApi.useExistingFieldsFetcher).toHaveBeenCalledWith(
        expect.objectContaining({
          dataViews: props.activeIndexPatterns,
          query: props.query,
          filters: props.filters,
          fromDate: props.dateRange.fromDate,
          toDate: props.dateRange.toDate,
        })
      );
      expect(UseExistingFieldsApi.useExistingFieldsReader).toHaveBeenCalled();
      expect(
        inst.find('[data-test-subj="unifiedFieldList__fieldListGroupedDescription"]').first().text()
      ).toBe('1 available field. 2 empty fields. 0 meta fields.');
    });

    it('does not load existence data if date and index pattern ids are unchanged', async () => {
      const props = testProps({
        currentIndexPatternId: 'a',
        existingFieldsByDataViewMap: {
          a: {
            [indexPatterns.a.fields[0].name]: true,
            [indexPatterns.a.fields[1].name]: true,
          },
        },
      });
      (UseExistingFieldsApi.useExistingFieldsFetcher as jest.Mock).mockImplementation(
        originalUseExistingFieldsFetcher
      );
      let inst: ReactWrapper;

      await act(async () => {
        inst = await mountWithIntl(<IndexPatternDataPanel {...props} />);
        inst.update();
      });

      expect(UseExistingFieldsApi.useExistingFieldsFetcher).toHaveBeenCalledWith(
        expect.objectContaining({
          dataViews: props.activeIndexPatterns,
          fromDate: props.dateRange.fromDate,
          toDate: props.dateRange.toDate,
        })
      );
      expect(ExistingFieldsServiceApi.loadFieldExisting).toHaveBeenCalledTimes(1);

      await act(async () => {
        await inst!.setProps({ dateRange: { fromDate: '2019-01-01', toDate: '2020-01-01' } });
        await inst!.update();
      });

      expect(ExistingFieldsServiceApi.loadFieldExisting).toHaveBeenCalledTimes(1);
    });

    it('loads existence data if date range changes', async () => {
      const props = testProps({
        currentIndexPatternId: 'a',
        existingFieldsByDataViewMap: {
          a: {
            [indexPatterns.a.fields[0].name]: true,
            [indexPatterns.a.fields[1].name]: true,
          },
        },
        otherProps: {
          dateRange: { fromDate: '2019-01-01', toDate: '2020-01-01' },
        },
      });
      (UseExistingFieldsApi.useExistingFieldsFetcher as jest.Mock).mockImplementation(
        originalUseExistingFieldsFetcher
      );
      let inst: ReactWrapper;

      await act(async () => {
        inst = await mountWithIntl(<IndexPatternDataPanel {...props} />);
        inst.update();
      });

      expect(UseExistingFieldsApi.useExistingFieldsFetcher).toHaveBeenCalledWith(
        expect.objectContaining({
          dataViews: props.activeIndexPatterns,
          fromDate: props.dateRange.fromDate,
          toDate: props.dateRange.toDate,
        })
      );
      expect(ExistingFieldsServiceApi.loadFieldExisting).toHaveBeenCalledWith(
        expect.objectContaining({
          fromDate: '2019-01-01',
          toDate: '2020-01-01',
          dslQuery,
        })
      );

      await act(async () => {
        await inst!.setProps({ dateRange: { fromDate: '2019-01-01', toDate: '2020-01-02' } });
        await inst!.update();
      });

      expect(ExistingFieldsServiceApi.loadFieldExisting).toHaveBeenCalledTimes(2);
      expect(ExistingFieldsServiceApi.loadFieldExisting).toHaveBeenCalledWith(
        expect.objectContaining({
          fromDate: '2019-01-01',
          toDate: '2020-01-02',
          dslQuery,
        })
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
      const inst = mountWithIntl(<IndexPatternDataPanel {...testProps(updateIndexPatterns)} />);
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
    let props: Parameters<typeof InnerIndexPatternDataPanel>[0];
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
        <InnerIndexPatternDataPanel
          {...defaultProps}
          frame={getFrameAPIMock({ existingFields: { idx1: {} } })}
        />
      );
      expect(wrapper.find(EuiCallOut).length).toEqual(2);
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
        <InnerIndexPatternDataPanel
          {...defaultProps}
          frame={getFrameAPIMock({ existingFields: {} })}
        />
      );
      expect(
        wrapper.find('[data-test-subj="lnsIndexPatternAvailableFields"]').find(EuiLoadingSpinner)
          .length
      ).toEqual(1);
      wrapper.setProps({ frame: getFrameAPIMock({ existingFields: { idx1: {} } }) });
      expect(wrapper.find(EuiCallOut).length).toEqual(2);
    });

    // TODO: refactor these tests
    // it('renders correct number of Field Items', () => {
    //   const wrapper = mountWithIntl(
    //     <FieldsAccordion {...defaultProps} exists={(field) => field.name === 'timestamp'} />
    //   );
    //   expect(wrapper.find(FieldItem).at(0).prop('exists')).toEqual(true);
    //   expect(wrapper.find(FieldItem).at(1).prop('exists')).toEqual(false);
    // });
    //
    // it('passed correct exists flag to each field', () => {
    //   const wrapper = mountWithIntl(<FieldsAccordion {...defaultProps} />);
    //   expect(wrapper.find(FieldItem).length).toEqual(2);
    // });

    it('should not allow field details when error', () => {
      const wrapper = mountWithIntl(
        <InnerIndexPatternDataPanel
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
        <InnerIndexPatternDataPanel
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

      expect(wrapper.find('[aria-live="polite"]').at(1).text()).toEqual(
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
      expect(wrapper.find(EuiCallOut).length).toEqual(3);
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
  });
});
