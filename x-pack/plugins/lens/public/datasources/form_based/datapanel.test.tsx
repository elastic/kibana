/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { DataView } from '@kbn/data-views-plugin/public';
import { UI_SETTINGS } from '@kbn/data-plugin/public';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import { dataViewPluginMocks } from '@kbn/data-views-plugin/public/mocks';
import { render, screen, within } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import userEvent from '@testing-library/user-event';
import { FormBasedDataPanel, FormBasedDataPanelProps } from './datapanel';
import * as UseExistingFieldsApi from '@kbn/unified-field-list/src/hooks/use_existing_fields';
import * as ExistingFieldsServiceApi from '@kbn/unified-field-list/src/services/field_existing/load_field_existing';
import { act } from 'react-dom/test-utils';
import { coreMock } from '@kbn/core/public/mocks';
import { FormBasedPrivateState } from './types';
import { documentField } from './document_field';
import { chartPluginMock } from '@kbn/charts-plugin/public/mocks';
import { fieldFormatsServiceMock } from '@kbn/field-formats-plugin/public/mocks';
import { indexPatternFieldEditorPluginMock } from '@kbn/data-view-field-editor-plugin/public/mocks';
import { getFieldByNameFactory } from './pure_helpers';
import { uiActionsPluginMock } from '@kbn/ui-actions-plugin/public/mocks';
import { createIndexPatternServiceMock } from '../../mocks/data_views_service_mock';
import { createMockFramePublicAPI } from '../../mocks';
import { DataViewsState } from '../../state_management';

const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

jest.spyOn(UseExistingFieldsApi, 'useExistingFieldsFetcher');
jest.spyOn(UseExistingFieldsApi, 'useExistingFieldsReader');

const loadFieldExistingMock = jest.spyOn(ExistingFieldsServiceApi, 'loadFieldExisting');
loadFieldExistingMock.mockResolvedValue({
  indexPatternTitle: 'idx1',
  existingFieldNames: [],
});

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

const indexPatterns = {
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
};

const core = coreMock.createStart();
const dataViews = dataViewPluginMocks.createStartContract();

const constructState = (currentIndexPatternId: string): FormBasedPrivateState => ({
  currentIndexPatternId,
  layers: {
    1: {
      indexPatternId: currentIndexPatternId,
      columnOrder: [],
      columns: {},
    },
  },
});

const frame = getFrameAPIMock({ indexPatterns });
const defaultProps = {
  data: dataPluginMock.createStartContract(),
  dataViews,
  fieldFormats: fieldFormatsServiceMock.createStartContract(),
  indexPatternFieldEditor: indexPatternFieldEditorPluginMock.createStartContract(),
  indexPatternService: createIndexPatternServiceMock({
    updateIndexPatterns: jest.fn(),
    core,
    dataViews,
  }),
  onIndexPatternRefresh: jest.fn(),
  core,
  dateRange: { fromDate: '2019-01-01', toDate: '2020-01-01' },
  charts: chartPluginMock.createSetupContract(),
  query: { query: '', language: 'lucene' },
  filters: [],
  showNoDataPopover: jest.fn(),
  dropOntoWorkspace: jest.fn(),
  hasSuggestionForField: jest.fn(() => false),
  uiActions: uiActionsPluginMock.createStartContract(),
  frame,
  activeIndexPatterns: [frame.dataViews.indexPatterns['1']],
  setState: jest.fn(),
  state: constructState('1'),
};

core.uiSettings.get.mockImplementation((key: string) => {
  if (key === UI_SETTINGS.META_FIELDS) {
    return [];
  }
});

dataViews.get.mockImplementation(async (id: string) => {
  const dataView = [indexPatterns['1'], indexPatterns['2']].find(
    (indexPattern) => indexPattern.id === id
  ) as unknown as DataView;
  dataView.metaFields = ['_id'];
  return dataView;
});

const waitToLoad = async () =>
  await act(async () => new Promise((resolve) => setTimeout(resolve, 0)));

const renderFormBasedDataPanel = async (propsOverrides?: Partial<FormBasedDataPanelProps>) => {
  const { rerender, ...rest } = render(
    <FormBasedDataPanel {...defaultProps} {...propsOverrides} />,
    {
      wrapper: ({ children }) => <I18nProvider>{children}</I18nProvider>,
    }
  );
  await waitToLoad();
  return {
    ...rest,
    rerender: async (overrides?: Partial<FormBasedDataPanelProps>) => {
      rerender(<FormBasedDataPanel {...defaultProps} {...overrides} />);
      await waitToLoad();
    },
  };
};

const getAriaDescription = () => screen.getByTestId('lnsIndexPattern__ariaDescription').textContent;

const getFieldNames = (container = 'fieldList') => {
  return [...within(screen.getByTestId(container)).queryAllByTestId('lnsFieldListPanelField')].map(
    (el) => el.querySelector('.kbnFieldButton__nameInner')?.textContent
  );
};

const getSelectedFieldsNames = () => getFieldNames('lnsIndexPatternSelectedFields');
const getAvailableFieldsNames = () => getFieldNames('lnsIndexPatternAvailableFields');
const getEmptyFieldsNames = () => getFieldNames('lnsIndexPatternEmptyFields');
const getMetaFieldsNames = () => getFieldNames('lnsIndexPatternMetaFields');

const searchForPhrase = async (phrase: string) => {
  jest.useFakeTimers();
  await user.type(screen.getByRole('searchbox', { name: 'Search field names' }), phrase);
  act(() => jest.advanceTimersByTime(256));
  jest.useRealTimers();
};

describe('FormBased Data Panel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    UseExistingFieldsApi.resetExistingFieldsCache();
    window.localStorage.removeItem('lens.unifiedFieldList.initiallyOpenSections');
  });

  it('should render a warning if there are no index patterns', async () => {
    await renderFormBasedDataPanel({
      state: {
        layers: {},
        currentIndexPatternId: '',
      },
      frame: createMockFramePublicAPI(),
    });

    expect(screen.getByTestId('indexPattern-no-indexpatterns')).toBeInTheDocument();
  });

  describe('loading existence data', () => {
    it('loads existence data', async () => {
      loadFieldExistingMock.mockResolvedValue({
        indexPatternTitle: 'idx1',
        existingFieldNames: [indexPatterns['1'].fields[0].name, indexPatterns['1'].fields[1].name],
      });

      await renderFormBasedDataPanel();

      expect(UseExistingFieldsApi.useExistingFieldsFetcher).toHaveBeenCalledWith(
        expect.objectContaining({
          dataViews: [indexPatterns['1']],
          query: defaultProps.query,
          filters: defaultProps.filters,
          fromDate: defaultProps.dateRange.fromDate,
          toDate: defaultProps.dateRange.toDate,
        })
      );
      expect(UseExistingFieldsApi.useExistingFieldsReader).toHaveBeenCalled();
      expect(getAriaDescription()).toBe('2 available fields. 3 empty fields. 0 meta fields.');
    });

    it('loads existence data for current index pattern id', async () => {
      loadFieldExistingMock.mockResolvedValue({
        indexPatternTitle: 'idx1',
        existingFieldNames: [indexPatterns['2'].fields[0].name],
      });

      await renderFormBasedDataPanel({
        state: constructState('2'),
      });

      expect(UseExistingFieldsApi.useExistingFieldsFetcher).toHaveBeenCalledWith(
        expect.objectContaining({
          dataViews: [indexPatterns['2']],
          query: defaultProps.query,
          filters: defaultProps.filters,
          fromDate: defaultProps.dateRange.fromDate,
          toDate: defaultProps.dateRange.toDate,
        })
      );
      expect(UseExistingFieldsApi.useExistingFieldsReader).toHaveBeenCalled();
      expect(getAriaDescription()).toBe('1 available field. 2 empty fields. 0 meta fields.');
    });

    it('does not load existence data if date and index pattern ids are unchanged', async () => {
      loadFieldExistingMock.mockResolvedValue({
        indexPatternTitle: 'idx1',
        existingFieldNames: [indexPatterns['1'].fields[0].name, indexPatterns['1'].fields[1].name],
      });

      const { rerender } = await renderFormBasedDataPanel();

      expect(UseExistingFieldsApi.useExistingFieldsFetcher).toHaveBeenCalledWith(
        expect.objectContaining({
          dataViews: [indexPatterns['1']],
          fromDate: defaultProps.dateRange.fromDate,
          toDate: defaultProps.dateRange.toDate,
        })
      );
      expect(ExistingFieldsServiceApi.loadFieldExisting).toHaveBeenCalledTimes(1);

      await rerender();
      expect(ExistingFieldsServiceApi.loadFieldExisting).toHaveBeenCalledTimes(1);
    });

    it('loads existence data if date range changes', async () => {
      loadFieldExistingMock.mockResolvedValue({
        indexPatternTitle: 'idx1',
        existingFieldNames: [indexPatterns['1'].fields[0].name, indexPatterns['1'].fields[1].name],
      });

      const { rerender } = await renderFormBasedDataPanel();

      expect(UseExistingFieldsApi.useExistingFieldsFetcher).toHaveBeenCalledWith(
        expect.objectContaining({
          dataViews: [indexPatterns['1']],
          fromDate: defaultProps.dateRange.fromDate,
          toDate: defaultProps.dateRange.toDate,
        })
      );
      expect(ExistingFieldsServiceApi.loadFieldExisting).toHaveBeenCalledTimes(1);
      expect(ExistingFieldsServiceApi.loadFieldExisting).toHaveBeenCalledWith(
        expect.objectContaining({
          fromDate: '2019-01-01',
          toDate: '2020-01-01',
          dslQuery,
          dataView: indexPatterns['1'],
          timeFieldName: indexPatterns['1'].timeFieldName,
        })
      );
      await rerender({ dateRange: { fromDate: '2019-01-01', toDate: '2020-01-02' } });

      expect(ExistingFieldsServiceApi.loadFieldExisting).toHaveBeenCalledTimes(2);
      expect(ExistingFieldsServiceApi.loadFieldExisting).toHaveBeenCalledWith(
        expect.objectContaining({
          fromDate: '2019-01-01',
          toDate: '2020-01-02',
          dslQuery,
          dataView: indexPatterns['1'],
          timeFieldName: indexPatterns['1'].timeFieldName,
        })
      );
    });

    it('loads existence data if layer index pattern changes', async () => {
      jest
        .spyOn(ExistingFieldsServiceApi, 'loadFieldExisting')
        .mockImplementation(async ({ dataView }) => ({
          indexPatternTitle: 'idx1',
          existingFieldNames:
            dataView.id === indexPatterns['1'].id
              ? [indexPatterns['1'].fields[0].name, indexPatterns['1'].fields[1].name]
              : [indexPatterns['2'].fields[0].name],
        }));

      const { rerender } = await renderFormBasedDataPanel();

      expect(UseExistingFieldsApi.useExistingFieldsFetcher).toHaveBeenCalledWith(
        expect.objectContaining({
          dataViews: [indexPatterns['1']],
          fromDate: defaultProps.dateRange.fromDate,
          toDate: defaultProps.dateRange.toDate,
        })
      );
      expect(ExistingFieldsServiceApi.loadFieldExisting).toHaveBeenCalledTimes(1);
      expect(ExistingFieldsServiceApi.loadFieldExisting).toHaveBeenCalledWith(
        expect.objectContaining({
          fromDate: '2019-01-01',
          toDate: '2020-01-01',
          dslQuery,
          dataView: indexPatterns['1'],
          timeFieldName: indexPatterns['1'].timeFieldName,
        })
      );

      expect(getAriaDescription()).toBe('2 available fields. 3 empty fields. 0 meta fields.');

      await rerender({ state: constructState('2') });

      expect(ExistingFieldsServiceApi.loadFieldExisting).toHaveBeenCalledTimes(2);
      expect(ExistingFieldsServiceApi.loadFieldExisting).toHaveBeenCalledWith(
        expect.objectContaining({
          fromDate: '2019-01-01',
          toDate: '2020-01-01',
          dslQuery,
          dataView: indexPatterns['2'],
          timeFieldName: indexPatterns['2'].timeFieldName,
        })
      );

      expect(getAriaDescription()).toBe('1 available field. 2 empty fields. 0 meta fields.');
    });

    it('shows a loading indicator when loading', async () => {
      let resolveFunction: (arg: {
        existingFieldNames: string[];
        indexPatternTitle: string;
      }) => void;
      loadFieldExistingMock.mockResolvedValue(
        new Promise((resolve) => {
          resolveFunction = resolve;
        })
      );

      await renderFormBasedDataPanel({ state: constructState('2') });
      expect(getAriaDescription()).toBe('');
      expect(screen.getByTestId('fieldListLoading')).toBeInTheDocument();

      await resolveFunction!({
        existingFieldNames: [indexPatterns['2'].fields[0].name],
        indexPatternTitle: 'idx1',
      });

      await waitToLoad();

      expect(getAriaDescription()).toBe('1 available field. 2 empty fields. 0 meta fields.');
      expect(screen.queryByTestId('fieldListLoading')).not.toBeInTheDocument();
    });

    it("should trigger showNoDataPopover if fields don't have data", async () => {
      loadFieldExistingMock.mockResolvedValue({
        existingFieldNames: [],
        indexPatternTitle: 'idx1',
      });

      await renderFormBasedDataPanel();

      expect(defaultProps.showNoDataPopover).toHaveBeenCalled();

      expect(getAriaDescription()).toBe('0 available fields. 5 empty fields. 0 meta fields.');
    });

    it("should default to empty dsl if query can't be parsed", async () => {
      loadFieldExistingMock.mockResolvedValue({
        indexPatternTitle: 'idx1',
        existingFieldNames: [indexPatterns['1'].fields[0].name, indexPatterns['1'].fields[1].name],
      });

      await renderFormBasedDataPanel({
        query: { language: 'kuery', query: '@timestamp : NOT *' },
      });

      expect(ExistingFieldsServiceApi.loadFieldExisting).toHaveBeenCalledWith(
        expect.objectContaining({ dslQuery: { bool: { must_not: { match_all: {} } } } })
      );

      expect(getAriaDescription()).toBe('2 available fields. 3 empty fields. 0 meta fields.');
    });
  });

  describe('displaying field list', () => {
    beforeEach(() => {
      loadFieldExistingMock.mockResolvedValue({
        existingFieldNames: ['bytes', 'memory'],
        indexPatternTitle: 'idx1',
      });
    });

    it('should list all selected fields if exist', async () => {
      await renderFormBasedDataPanel({ layerFields: ['bytes'] });
      expect(getSelectedFieldsNames()).toEqual(['bytes']);
    });

    it('should not list the selected fields accordion if no fields given', async () => {
      await renderFormBasedDataPanel();
      expect(screen.queryByTestId('lnsIndexPatternSelectedFields')).not.toBeInTheDocument();
    });

    it('should list all supported fields in the pattern sorted alphabetically in groups', async () => {
      const { container } = await renderFormBasedDataPanel();
      expect(container.querySelector('.kbnFieldButton__nameInner')).toHaveTextContent('Records');
      expect(getAvailableFieldsNames()).toEqual(['amemory', 'bytes']);
      await userEvent.click(screen.getByText('Empty fields'));
      expect(getEmptyFieldsNames()).toEqual(['client', 'source', 'timestampLabel']);
    });

    it('should show meta fields accordion', async () => {
      await renderFormBasedDataPanel({
        frame: getFrameAPIMock({
          indexPatterns: {
            '1': {
              ...defaultProps.frame.dataViews.indexPatterns['1'],
              fields: [
                ...defaultProps.frame.dataViews.indexPatterns['1'].fields,
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
        }),
      });
      await userEvent.click(screen.getByText('Meta fields'));
      expect(getMetaFieldsNames()).toEqual(['_id']);
    });

    it('should display NoFieldsCallout when all fields are empty', async () => {
      loadFieldExistingMock.mockResolvedValueOnce({
        existingFieldNames: [],
        indexPatternTitle: 'idx1',
      });
      await renderFormBasedDataPanel();
      expect(getAvailableFieldsNames()).toEqual([]);
      expect(
        screen.getByTestId('lnsIndexPatternAvailableFieldsNoFieldsCallout-noFieldsMatch')
      ).toBeInTheDocument();

      await userEvent.click(screen.getByText('Empty fields'));

      expect(getEmptyFieldsNames()).toEqual([
        'amemory',
        'bytes',
        'client',
        'source',
        'timestampLabel',
      ]);
    });

    it('should display spinner for available fields accordion if existing fields are not loaded yet', async () => {
      let resolveFunction: (arg: {
        existingFieldNames: string[];
        indexPatternTitle: string;
      }) => void;
      loadFieldExistingMock.mockResolvedValueOnce(
        new Promise((resolve) => {
          resolveFunction = resolve;
        })
      );
      await renderFormBasedDataPanel();
      expect(screen.getByTestId('fieldListLoading')).toBeInTheDocument();
      expect(
        screen.queryByTestId('lnsIndexPatternMetaFieldsNoFieldsCallout-noFieldsMatch')
      ).not.toBeInTheDocument();

      await act(async () => {
        resolveFunction!({
          existingFieldNames: [],
          indexPatternTitle: 'idx1',
        });
      });

      expect(screen.queryByTestId('fieldListLoading')).not.toBeInTheDocument();
      expect(
        screen.getByTestId('lnsIndexPatternMetaFieldsNoFieldsCallout-noFieldsMatch')
      ).toBeInTheDocument();
    });

    it('should show error when loading fails', async () => {
      loadFieldExistingMock.mockImplementation(() => {
        throw new Error('idx1');
      });

      await renderFormBasedDataPanel();
      expect(screen.getByTestId('lnsIndexPatternAvailableFields-fetchWarning')).toBeInTheDocument();
    });

    it('should filter down by name', async () => {
      await renderFormBasedDataPanel();
      await searchForPhrase('me');
      await userEvent.click(screen.getByText('Empty fields'));
      expect(getFieldNames()).toEqual(['amemory', 'timestampLabel']);
    });

    it('should announce filter in live region', async () => {
      await renderFormBasedDataPanel();
      await searchForPhrase('me');
      expect(getFieldNames()).toEqual(['amemory']);
      expect(getAriaDescription()).toBe('1 available field. 1 empty field. 0 meta fields.');
      await userEvent.click(screen.getByTestId('lnsIndexPatternEmptyFields'));

      expect(screen.getByTestId('lnsIndexPattern__ariaDescription').getAttribute('aria-live')).toBe(
        'polite'
      );
    });

    it('should filter down by type', async () => {
      await renderFormBasedDataPanel();

      await userEvent.click(screen.getByTestId('lnsIndexPatternFieldTypeFilterToggle'));
      await userEvent.click(screen.getByTestId('typeFilter-document'));

      expect(getFieldNames()).toEqual(['Records']);
    });

    it('should display no fields in groups when filtered by type Record', async () => {
      await renderFormBasedDataPanel();
      await userEvent.click(screen.getByTestId('lnsIndexPatternFieldTypeFilterToggle'));
      await userEvent.click(screen.getByTestId('typeFilter-document'));
      expect(screen.getAllByTestId('lnsFieldListPanelField').length).toEqual(1);
      expect(getFieldNames()).toEqual(['Records']);
      expect(
        screen.getByTestId('lnsIndexPatternAvailableFieldsNoFieldsCallout-noFieldsMatch')
      ).toBeInTheDocument();
      expect(
        screen.getByTestId('lnsIndexPatternMetaFieldsNoFieldsCallout-noFieldsMatch')
      ).toBeInTheDocument();
    });

    it('should toggle type if clicked again', async () => {
      await renderFormBasedDataPanel();
      await userEvent.click(screen.getByTestId('lnsIndexPatternFieldTypeFilterToggle'));
      await userEvent.click(screen.getByTestId('typeFilter-number'));
      expect(getFieldNames()).toEqual(['amemory', 'bytes']);
      await userEvent.click(screen.getByTestId('typeFilter-number'));
      expect(getFieldNames()).toEqual(['Records', 'amemory', 'bytes']);
    });

    it('should filter down by names', async () => {
      await renderFormBasedDataPanel();
      await searchForPhrase('me');
      expect(getFieldNames()).toEqual(['amemory']);
    });
    it('should filter down by types', async () => {
      await renderFormBasedDataPanel();
      await userEvent.click(screen.getByTestId('lnsIndexPatternFieldTypeFilterToggle'));
      await userEvent.click(screen.getByTestId('typeFilter-number'));
      expect(getFieldNames()).toEqual(['amemory', 'bytes']);
    });
  });
});
