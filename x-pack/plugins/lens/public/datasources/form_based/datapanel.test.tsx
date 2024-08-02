/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import {
  dataViewPluginMocks,
  Start as DataViewPublicStart,
} from '@kbn/data-views-plugin/public/mocks';
import { InnerFormBasedDataPanel, FormBasedDataPanel } from './datapanel';
import { FieldListGrouped } from '@kbn/unified-field-list';
import * as UseExistingFieldsApi from '@kbn/unified-field-list/src/hooks/use_existing_fields';
import * as ExistingFieldsServiceApi from '@kbn/unified-field-list/src/services/field_existing/load_field_existing';
import { FieldItem } from '../common/field_item';
import { act } from 'react-dom/test-utils';
import { coreMock } from '@kbn/core/public/mocks';
import { FormBasedPrivateState } from './types';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import { EuiCallOut, EuiLoadingSpinner, EuiProgress } from '@elastic/eui';
import { documentField } from './document_field';
import { chartPluginMock } from '@kbn/charts-plugin/public/mocks';
import { fieldFormatsServiceMock } from '@kbn/field-formats-plugin/public/mocks';
import { indexPatternFieldEditorPluginMock } from '@kbn/data-view-field-editor-plugin/public/mocks';
import { getFieldByNameFactory } from './pure_helpers';
import { uiActionsPluginMock } from '@kbn/ui-actions-plugin/public/mocks';
import { TermsIndexPatternColumn } from './operations';
import { DOCUMENT_FIELD_NAME } from '../../../common/constants';
import { createIndexPatternServiceMock } from '../../mocks/data_views_service_mock';
import { createMockFramePublicAPI } from '../../mocks';
import { DataViewsState } from '../../state_management';
import { DataView } from '@kbn/data-views-plugin/public';
import { UI_SETTINGS } from '@kbn/data-plugin/public';
import { ReactWrapper } from 'enzyme';
import { IndexPatternField } from '../../types';

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

jest.spyOn(UseExistingFieldsApi, 'useExistingFieldsFetcher');
jest.spyOn(UseExistingFieldsApi, 'useExistingFieldsReader');
jest.spyOn(ExistingFieldsServiceApi, 'loadFieldExisting').mockImplementation(async () => ({
  indexPatternTitle: 'test',
  existingFieldNames: [],
}));

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

function getFrameAPIMock({
  indexPatterns,
  ...rest
}: Partial<DataViewsState> & { indexPatterns: DataViewsState['indexPatterns'] }) {
  const frameAPI = createMockFramePublicAPI();

  return {
    ...frameAPI,
    dataViews: {
      ...frameAPI.dataViews,
      indexPatterns,
      ...rest,
    },
  };
}

const dslQuery = { bool: { must: [], filter: [], should: [], must_not: [] } };

// @ts-expect-error Portal mocks are notoriously difficult to type
ReactDOM.createPortal = jest.fn((element) => element);

async function mountAndWaitForLazyModules(component: React.ReactElement): Promise<ReactWrapper> {
  let inst: ReactWrapper;
  await act(async () => {
    inst = await mountWithIntl(component);
    // wait for lazy modules
    await new Promise((resolve) => setTimeout(resolve, 0));
    await inst.update();
  });

  return inst!;
}

// TODO: After the i18n upgrade it seem that some underlying error in these tests surfaced:
// | TypeError: Cannot read properties of null (reading 'tag')
// Does not seem related to the i18n upgrade
describe.skip('FormBased Data Panel', () => {
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

  let defaultProps: Parameters<typeof InnerFormBasedDataPanel>[0] & {
    showNoDataPopover: () => void;
  };
  let core: ReturnType<(typeof coreMock)['createStart']>;
  let dataViews: DataViewPublicStart;

  beforeEach(() => {
    core = coreMock.createStart();
    dataViews = dataViewPluginMocks.createStartContract();
    const frame = getFrameAPIMock({ indexPatterns: defaultIndexPatterns });
    defaultProps = {
      data: dataPluginMock.createStartContract(),
      dataViews,
      fieldFormats: fieldFormatsServiceMock.createStartContract(),
      indexPatternFieldEditor: indexPatternFieldEditorPluginMock.createStartContract(),
      onIndexPatternRefresh: jest.fn(),
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

    core.uiSettings.get.mockImplementation((key: string) => {
      if (key === UI_SETTINGS.META_FIELDS) {
        return [];
      }
    });
    dataViews.get.mockImplementation(async (id: string) => {
      const dataView = [
        indexPatterns.a,
        indexPatterns.b,
        defaultIndexPatterns['1'],
        defaultIndexPatterns['2'],
        defaultIndexPatterns['3'],
      ].find((indexPattern) => indexPattern.id === id) as unknown as DataView;
      dataView.metaFields = ['_id'];
      return dataView;
    });
    (ExistingFieldsServiceApi.loadFieldExisting as jest.Mock).mockClear();
    (UseExistingFieldsApi.useExistingFieldsReader as jest.Mock).mockClear();
    (UseExistingFieldsApi.useExistingFieldsFetcher as jest.Mock).mockClear();
    UseExistingFieldsApi.resetExistingFieldsCache();
    window.localStorage.removeItem('lens.unifiedFieldList.initiallyOpenSections');
  });

  it('should render a warning if there are no index patterns', async () => {
    const wrapper = await mountAndWaitForLazyModules(
      <FormBasedDataPanel
        {...defaultProps}
        state={{
          ...initialState,
          currentIndexPatternId: '',
        }}
        setState={jest.fn()}
        frame={createMockFramePublicAPI()}
      />
    );
    expect(wrapper.find('[data-test-subj="indexPattern-no-indexpatterns"]').exists()).toBeTruthy();
  });

  describe('loading existence data', () => {
    function testProps({
      currentIndexPatternId,
      otherProps,
    }: {
      currentIndexPatternId: keyof typeof indexPatterns;
      otherProps?: object;
    }) {
      return {
        ...defaultProps,
        indexPatternService: createIndexPatternServiceMock({
          updateIndexPatterns: jest.fn(),
          core,
          dataViews,
        }),
        setState: jest.fn(),
        dateRange: { fromDate: '2019-01-01', toDate: '2020-01-01' },
        frame: getFrameAPIMock({
          indexPatterns: indexPatterns as unknown as DataViewsState['indexPatterns'],
        }),
        state: {
          currentIndexPatternId,
          layers: {
            1: {
              indexPatternId: currentIndexPatternId,
              columnOrder: [],
              columns: {},
            },
          },
        } as FormBasedPrivateState,
        ...(otherProps || {}),
      };
    }

    it('loads existence data', async () => {
      const props = testProps({
        currentIndexPatternId: 'a',
      });

      (ExistingFieldsServiceApi.loadFieldExisting as jest.Mock).mockImplementation(async () => {
        return {
          existingFieldNames: [indexPatterns.a.fields[0].name, indexPatterns.a.fields[1].name],
        };
      });

      const inst = await mountAndWaitForLazyModules(<FormBasedDataPanel {...props} />);

      expect(UseExistingFieldsApi.useExistingFieldsFetcher).toHaveBeenCalledWith(
        expect.objectContaining({
          dataViews: [indexPatterns.a],
          query: props.query,
          filters: props.filters,
          fromDate: props.dateRange.fromDate,
          toDate: props.dateRange.toDate,
        })
      );
      expect(UseExistingFieldsApi.useExistingFieldsReader).toHaveBeenCalled();
      expect(inst.find('[data-test-subj="lnsIndexPattern__ariaDescription"]').first().text()).toBe(
        '2 available fields. 3 empty fields. 0 meta fields.'
      );
    });

    it('loads existence data for current index pattern id', async () => {
      const props = testProps({
        currentIndexPatternId: 'b',
      });

      (ExistingFieldsServiceApi.loadFieldExisting as jest.Mock).mockImplementation(async () => {
        return {
          existingFieldNames: [indexPatterns.b.fields[0].name],
        };
      });

      const inst = await mountAndWaitForLazyModules(<FormBasedDataPanel {...props} />);

      expect(UseExistingFieldsApi.useExistingFieldsFetcher).toHaveBeenCalledWith(
        expect.objectContaining({
          dataViews: [indexPatterns.b],
          query: props.query,
          filters: props.filters,
          fromDate: props.dateRange.fromDate,
          toDate: props.dateRange.toDate,
        })
      );
      expect(UseExistingFieldsApi.useExistingFieldsReader).toHaveBeenCalled();
      expect(inst.find('[data-test-subj="lnsIndexPattern__ariaDescription"]').first().text()).toBe(
        '1 available field. 2 empty fields. 0 meta fields.'
      );
    });

    it('does not load existence data if date and index pattern ids are unchanged', async () => {
      const props = testProps({
        currentIndexPatternId: 'a',
        otherProps: {
          dateRange: { fromDate: '2019-01-01', toDate: '2020-01-01' },
        },
      });

      (ExistingFieldsServiceApi.loadFieldExisting as jest.Mock).mockImplementation(async () => {
        return {
          existingFieldNames: [indexPatterns.a.fields[0].name, indexPatterns.a.fields[1].name],
        };
      });

      const inst = await mountAndWaitForLazyModules(<FormBasedDataPanel {...props} />);

      expect(UseExistingFieldsApi.useExistingFieldsFetcher).toHaveBeenCalledWith(
        expect.objectContaining({
          dataViews: [indexPatterns.a],
          fromDate: props.dateRange.fromDate,
          toDate: props.dateRange.toDate,
        })
      );
      expect(ExistingFieldsServiceApi.loadFieldExisting).toHaveBeenCalledTimes(1);

      await act(async () => {
        await inst.setProps({ dateRange: { fromDate: '2019-01-01', toDate: '2020-01-01' } });
        await inst.update();
      });

      expect(ExistingFieldsServiceApi.loadFieldExisting).toHaveBeenCalledTimes(1);
    });

    it('loads existence data if date range changes', async () => {
      const props = testProps({
        currentIndexPatternId: 'a',
        otherProps: {
          dateRange: { fromDate: '2019-01-01', toDate: '2020-01-01' },
        },
      });

      (ExistingFieldsServiceApi.loadFieldExisting as jest.Mock).mockImplementation(async () => {
        return {
          existingFieldNames: [indexPatterns.a.fields[0].name, indexPatterns.a.fields[1].name],
        };
      });

      const inst = await mountAndWaitForLazyModules(<FormBasedDataPanel {...props} />);

      expect(UseExistingFieldsApi.useExistingFieldsFetcher).toHaveBeenCalledWith(
        expect.objectContaining({
          dataViews: [indexPatterns.a],
          fromDate: props.dateRange.fromDate,
          toDate: props.dateRange.toDate,
        })
      );
      expect(ExistingFieldsServiceApi.loadFieldExisting).toHaveBeenCalledTimes(1);
      expect(ExistingFieldsServiceApi.loadFieldExisting).toHaveBeenCalledWith(
        expect.objectContaining({
          fromDate: '2019-01-01',
          toDate: '2020-01-01',
          dslQuery,
          dataView: indexPatterns.a,
          timeFieldName: indexPatterns.a.timeFieldName,
        })
      );

      await act(async () => {
        await inst.setProps({ dateRange: { fromDate: '2019-01-01', toDate: '2020-01-02' } });
        await inst.update();
      });

      expect(ExistingFieldsServiceApi.loadFieldExisting).toHaveBeenCalledTimes(2);
      expect(ExistingFieldsServiceApi.loadFieldExisting).toHaveBeenCalledWith(
        expect.objectContaining({
          fromDate: '2019-01-01',
          toDate: '2020-01-02',
          dslQuery,
          dataView: indexPatterns.a,
          timeFieldName: indexPatterns.a.timeFieldName,
        })
      );
    });

    it('loads existence data if layer index pattern changes', async () => {
      const props = testProps({
        currentIndexPatternId: 'a',
        otherProps: {
          dateRange: { fromDate: '2019-01-01', toDate: '2020-01-01' },
        },
      });

      (ExistingFieldsServiceApi.loadFieldExisting as jest.Mock).mockImplementation(
        async ({ dataView }) => {
          return {
            existingFieldNames:
              dataView === indexPatterns.a
                ? [indexPatterns.a.fields[0].name, indexPatterns.a.fields[1].name]
                : [indexPatterns.b.fields[0].name],
          };
        }
      );

      const inst = await mountAndWaitForLazyModules(<FormBasedDataPanel {...props} />);

      expect(UseExistingFieldsApi.useExistingFieldsFetcher).toHaveBeenCalledWith(
        expect.objectContaining({
          dataViews: [indexPatterns.a],
          fromDate: props.dateRange.fromDate,
          toDate: props.dateRange.toDate,
        })
      );
      expect(ExistingFieldsServiceApi.loadFieldExisting).toHaveBeenCalledTimes(1);
      expect(ExistingFieldsServiceApi.loadFieldExisting).toHaveBeenCalledWith(
        expect.objectContaining({
          fromDate: '2019-01-01',
          toDate: '2020-01-01',
          dslQuery,
          dataView: indexPatterns.a,
          timeFieldName: indexPatterns.a.timeFieldName,
        })
      );

      expect(inst.find('[data-test-subj="lnsIndexPattern__ariaDescription"]').first().text()).toBe(
        '2 available fields. 3 empty fields. 0 meta fields.'
      );

      await act(async () => {
        await inst.setProps({
          currentIndexPatternId: 'b',
          state: {
            currentIndexPatternId: 'b',
            layers: {
              1: {
                indexPatternId: 'b',
                columnOrder: [],
                columns: {},
              },
            },
          } as FormBasedPrivateState,
        });
        await inst.update();
      });

      expect(ExistingFieldsServiceApi.loadFieldExisting).toHaveBeenCalledTimes(2);
      expect(ExistingFieldsServiceApi.loadFieldExisting).toHaveBeenCalledWith(
        expect.objectContaining({
          fromDate: '2019-01-01',
          toDate: '2020-01-01',
          dslQuery,
          dataView: indexPatterns.b,
          timeFieldName: indexPatterns.b.timeFieldName,
        })
      );

      expect(inst.find('[data-test-subj="lnsIndexPattern__ariaDescription"]').first().text()).toBe(
        '1 available field. 2 empty fields. 0 meta fields.'
      );
    });

    it('shows a loading indicator when loading', async () => {
      const props = testProps({
        currentIndexPatternId: 'b',
      });

      let resolveFunction: (arg: unknown) => void;
      (ExistingFieldsServiceApi.loadFieldExisting as jest.Mock).mockReset();
      (ExistingFieldsServiceApi.loadFieldExisting as jest.Mock).mockImplementation(() => {
        return new Promise((resolve) => {
          resolveFunction = resolve;
        });
      });
      const inst = await mountAndWaitForLazyModules(<FormBasedDataPanel {...props} />);

      expect(inst.find(EuiProgress).length).toEqual(1);
      expect(inst.find('[data-test-subj="lnsIndexPattern__ariaDescription"]').first().text()).toBe(
        ''
      );

      await act(async () => {
        resolveFunction!({
          existingFieldNames: [indexPatterns.b.fields[0].name],
        });
        await inst.update();
      });

      await act(async () => {
        await inst.update();
      });

      expect(inst.find(EuiProgress).length).toEqual(0);
      expect(inst.find('[data-test-subj="lnsIndexPattern__ariaDescription"]').first().text()).toBe(
        '1 available field. 2 empty fields. 0 meta fields.'
      );
    });

    it("should trigger showNoDataPopover if fields don't have data", async () => {
      const props = testProps({
        currentIndexPatternId: 'a',
      });

      (ExistingFieldsServiceApi.loadFieldExisting as jest.Mock).mockImplementation(async () => {
        return {
          existingFieldNames: [],
        };
      });

      const inst = await mountAndWaitForLazyModules(<FormBasedDataPanel {...props} />);

      expect(defaultProps.showNoDataPopover).toHaveBeenCalled();

      expect(inst.find('[data-test-subj="lnsIndexPattern__ariaDescription"]').first().text()).toBe(
        '0 available fields. 5 empty fields. 0 meta fields.'
      );
    });

    it("should default to empty dsl if query can't be parsed", async () => {
      const props = testProps({
        currentIndexPatternId: 'a',
        otherProps: {
          query: {
            language: 'kuery',
            query: '@timestamp : NOT *',
          },
        },
      });

      (ExistingFieldsServiceApi.loadFieldExisting as jest.Mock).mockImplementation(async () => {
        return {
          existingFieldNames: [indexPatterns.a.fields[0].name, indexPatterns.a.fields[1].name],
        };
      });

      const inst = await mountAndWaitForLazyModules(<FormBasedDataPanel {...props} />);

      expect(ExistingFieldsServiceApi.loadFieldExisting).toHaveBeenCalledWith(
        expect.objectContaining({
          dslQuery: {
            bool: {
              must_not: {
                match_all: {},
              },
            },
          },
        })
      );

      expect(inst.find('[data-test-subj="lnsIndexPattern__ariaDescription"]').first().text()).toBe(
        '2 available fields. 3 empty fields. 0 meta fields.'
      );
    });
  });

  describe('displaying field list', () => {
    let props: Parameters<typeof InnerFormBasedDataPanel>[0];
    beforeEach(() => {
      props = {
        ...defaultProps,
      };

      (ExistingFieldsServiceApi.loadFieldExisting as jest.Mock).mockImplementation(async () => {
        return {
          existingFieldNames: ['bytes', 'memory'],
        };
      });
    });

    it('should list all selected fields if exist', async () => {
      const newProps = {
        ...props,
        layerFields: ['bytes'],
      };

      const wrapper = await mountAndWaitForLazyModules(<InnerFormBasedDataPanel {...newProps} />);

      expect(
        wrapper
          .find('[data-test-subj="lnsIndexPatternSelectedFields"]')
          .find(FieldItem)
          .map((fieldItem) => fieldItem.prop('field').name)
      ).toEqual(['bytes']);
    });

    it('should not list the selected fields accordion if no fields given', async () => {
      const wrapper = await mountAndWaitForLazyModules(<InnerFormBasedDataPanel {...props} />);

      expect(
        wrapper!
          .find('[data-test-subj="lnsIndexPatternSelectedFields"]')
          .find(FieldItem)
          .map((fieldItem) => fieldItem.prop('field').name)
      ).toEqual([]);
    });

    it('should list all supported fields in the pattern sorted alphabetically in groups', async () => {
      const wrapper = await mountAndWaitForLazyModules(<InnerFormBasedDataPanel {...props} />);

      expect(wrapper.find(FieldItem).first().prop('field')).toEqual(
        expect.objectContaining({
          displayName: 'Records',
        })
      );
      const availableAccordion = wrapper.find('[data-test-subj="lnsIndexPatternAvailableFields"]');
      expect(
        availableAccordion.find(FieldItem).map((fieldItem) => fieldItem.prop('field').name)
      ).toEqual(['memory', 'bytes']);
      expect(availableAccordion.find(FieldItem).at(0).prop('exists')).toEqual(true);
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
        emptyAccordion
          .find(FieldItem)
          .map((fieldItem) => (fieldItem.prop('field') as IndexPatternField).displayName)
      ).toEqual(['client', 'source', 'timestampLabel']);
      expect(emptyAccordion.find(FieldItem).at(1).prop('exists')).toEqual(false);
    });

    it('should show meta fields accordion', async () => {
      const wrapper = await mountAndWaitForLazyModules(
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
      (ExistingFieldsServiceApi.loadFieldExisting as jest.Mock).mockImplementation(async () => {
        return {
          existingFieldNames: [],
        };
      });

      const wrapper = await mountAndWaitForLazyModules(<InnerFormBasedDataPanel {...props} />);

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
          .map((fieldItem) => (fieldItem.prop('field') as IndexPatternField).displayName)
      ).toEqual(['amemory', 'bytes', 'client', 'source', 'timestampLabel']);
    });

    it('should display spinner for available fields accordion if existing fields are not loaded yet', async () => {
      let resolveFunction: (arg: unknown) => void;
      (ExistingFieldsServiceApi.loadFieldExisting as jest.Mock).mockReset();
      (ExistingFieldsServiceApi.loadFieldExisting as jest.Mock).mockImplementation(() => {
        return new Promise((resolve) => {
          resolveFunction = resolve;
        });
      });
      const wrapper = await mountAndWaitForLazyModules(<InnerFormBasedDataPanel {...props} />);

      expect(
        wrapper.find('[data-test-subj="lnsIndexPatternAvailableFields"]').find(EuiLoadingSpinner)
          .length
      ).toEqual(1);
      expect(wrapper.find(EuiCallOut).length).toEqual(0);

      await act(async () => {
        resolveFunction!({
          existingFieldNames: [],
        });
      });

      await act(async () => {
        await wrapper.update();
      });

      expect(
        wrapper.find('[data-test-subj="lnsIndexPatternAvailableFields"]').find(EuiLoadingSpinner)
          .length
      ).toEqual(0);
      expect(wrapper.find(EuiCallOut).length).toEqual(2);
    });

    it('should not allow field details when error', async () => {
      (ExistingFieldsServiceApi.loadFieldExisting as jest.Mock).mockImplementation(async () => {
        throw new Error('test');
      });

      const wrapper = await mountAndWaitForLazyModules(<InnerFormBasedDataPanel {...props} />);

      expect(wrapper.find(FieldListGrouped).prop('fieldGroups')).toEqual(
        expect.objectContaining({
          AvailableFields: expect.objectContaining({ hideDetails: true }),
        })
      );
    });

    it('should filter down by name', async () => {
      const wrapper = await mountAndWaitForLazyModules(<InnerFormBasedDataPanel {...props} />);

      act(() => {
        wrapper.find('[data-test-subj="lnsIndexPatternFieldSearch"] input').simulate('change', {
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

    it('should announce filter in live region', async () => {
      const wrapper = await mountAndWaitForLazyModules(<InnerFormBasedDataPanel {...props} />);

      act(() => {
        wrapper.find('[data-test-subj="lnsIndexPatternFieldSearch"] input').simulate('change', {
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

    it('should filter down by type', async () => {
      const wrapper = await mountAndWaitForLazyModules(<InnerFormBasedDataPanel {...props} />);

      wrapper
        .find('[data-test-subj="lnsIndexPatternFieldTypeFilterToggle"]')
        .last()
        .simulate('click');

      wrapper.find('[data-test-subj="typeFilter-number"]').first().simulate('click');

      expect(
        wrapper
          .find(FieldItem)
          .map((fieldItem) => (fieldItem.prop('field') as IndexPatternField).displayName)
      ).toEqual(['amemory', 'bytes']);
    });

    it('should display no fields in groups when filtered by type Record', async () => {
      const wrapper = await mountAndWaitForLazyModules(<InnerFormBasedDataPanel {...props} />);

      wrapper
        .find('[data-test-subj="lnsIndexPatternFieldTypeFilterToggle"]')
        .last()
        .simulate('click');

      wrapper.find('[data-test-subj="typeFilter-document"]').first().simulate('click');

      expect(wrapper.find(FieldItem).map((fieldItem) => fieldItem.prop('field').name)).toEqual([
        DOCUMENT_FIELD_NAME,
      ]);
      expect(wrapper.find(EuiCallOut).length).toEqual(2);
    });

    it('should toggle type if clicked again', async () => {
      const wrapper = await mountAndWaitForLazyModules(<InnerFormBasedDataPanel {...props} />);

      wrapper
        .find('[data-test-subj="lnsIndexPatternFieldTypeFilterToggle"]')
        .last()
        .simulate('click');

      wrapper.find('[data-test-subj="typeFilter-number"]').first().simulate('click');
      wrapper.find('[data-test-subj="typeFilter-number"]').first().simulate('click');
      wrapper
        .find('[data-test-subj="lnsIndexPatternEmptyFields"]')
        .find('button')
        .first()
        .simulate('click');
      expect(
        wrapper
          .find(FieldItem)
          .map((fieldItem) => (fieldItem.prop('field') as IndexPatternField).displayName)
      ).toEqual(['Records', 'amemory', 'bytes', 'client', 'source', 'timestampLabel']);
    });

    it('should filter down by type and by name', async () => {
      const wrapper = await mountAndWaitForLazyModules(<InnerFormBasedDataPanel {...props} />);

      act(() => {
        wrapper.find('[data-test-subj="lnsIndexPatternFieldSearch"] input').simulate('change', {
          target: { value: 'me' },
        });
      });

      wrapper
        .find('[data-test-subj="lnsIndexPatternFieldTypeFilterToggle"]')
        .last()
        .simulate('click');

      wrapper.find('[data-test-subj="typeFilter-number"]').first().simulate('click');

      expect(wrapper.find(FieldItem).map((fieldItem) => fieldItem.prop('field').name)).toEqual([
        'memory',
      ]);
    });
  });
});
