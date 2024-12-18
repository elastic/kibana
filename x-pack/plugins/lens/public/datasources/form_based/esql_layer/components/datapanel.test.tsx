/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { act } from 'react-dom/test-utils';
import type { Query } from '@kbn/es-query';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import { expressionsPluginMock } from '@kbn/expressions-plugin/public/mocks';
import {
  dataViewPluginMocks,
  Start as DataViewPublicStart,
} from '@kbn/data-views-plugin/public/mocks';
import type { DatatableColumn } from '@kbn/expressions-plugin/public';
import { coreMock } from '@kbn/core/public/mocks';
import { uiActionsPluginMock } from '@kbn/ui-actions-plugin/public/mocks';
import userEvent from '@testing-library/user-event';
import { render, screen, within } from '@testing-library/react';

import { type TextBasedDataPanelProps, TextBasedDataPanel } from './datapanel';
import type { TextBasedPrivateState } from '../types';

import { createIndexPatternServiceMock } from '../../../mocks/data_views_service_mock';
import { createMockFramePublicAPI } from '../../../mocks';
import { DataViewsState } from '../../../state_management';
import { addColumnsToCache } from '../fieldlist_cache';

const fieldsFromQuery = [
  {
    name: 'timestamp',
    id: 'timestamp',
    meta: {
      type: 'date',
    },
  },
  {
    name: 'bytes',
    id: 'bytes',
    meta: {
      type: 'number',
    },
  },
  {
    name: 'memory',
    id: 'memory',
    meta: {
      type: 'number',
    },
  },
] as DatatableColumn[];

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
];

const initialState: TextBasedPrivateState = {
  layers: {
    first: {
      index: '1',
      columns: [],
      query: { esql: 'FROM foo' },
    },
  },
  indexPatternRefs: [
    { id: '1', title: 'my-fake-index-pattern' },
    { id: '2', title: 'my-fake-restricted-pattern' },
    { id: '3', title: 'my-compatible-pattern' },
  ],
};

addColumnsToCache({ esql: 'FROM my-fake-index-pattern' }, fieldsFromQuery);

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

// @ts-expect-error Portal mocks are notoriously difficult to type
ReactDOM.createPortal = jest.fn((element) => element);

describe('TextBased Query Languages Data Panel', () => {
  let core: ReturnType<(typeof coreMock)['createStart']>;
  let dataViews: DataViewPublicStart;
  const defaultIndexPatterns = {
    '1': {
      id: '1',
      title: 'idx1',
      timeFieldName: 'timestamp',
      hasRestrictions: false,
      fields: fieldsOne,
      getFieldByName: jest.fn(),
      isPersisted: true,
      spec: {},
    },
  };

  let defaultProps: TextBasedDataPanelProps;
  const dataViewsMock = dataViewPluginMocks.createStartContract();

  beforeEach(() => {
    core = coreMock.createStart();
    dataViews = dataViewPluginMocks.createStartContract();
    defaultProps = {
      data: dataPluginMock.createStartContract(),
      expressions: expressionsPluginMock.createStartContract(),
      dataViews: {
        ...dataViewsMock,
        getIdsWithTitle: jest.fn().mockReturnValue(
          Promise.resolve([
            { id: '1', title: 'my-fake-index-pattern' },
            { id: '2', title: 'my-fake-restricted-pattern' },
            { id: '3', title: 'my-compatible-pattern' },
          ])
        ),
      },
      core,
      dateRange: {
        fromDate: 'now-7d',
        toDate: 'now',
      },
      query: { esql: 'FROM my-fake-index-pattern' } as unknown as Query,
      filters: [],
      showNoDataPopover: jest.fn(),
      dropOntoWorkspace: jest.fn(),
      hasSuggestionForField: jest.fn(() => false),
      uiActions: uiActionsPluginMock.createStartContract(),
      indexPatternService: createIndexPatternServiceMock({ core, dataViews }),
      frame: getFrameAPIMock({ indexPatterns: defaultIndexPatterns }),
      state: initialState,
      setState: jest.fn(),
      onChangeIndexPattern: jest.fn(),
    };
  });

  const renderTextBasedDataPanel = async (propsOverrides?: Partial<TextBasedDataPanelProps>) => {
    const rtlRender = render(<TextBasedDataPanel {...defaultProps} {...propsOverrides} />);
    await act(async () => {
      // wait for lazy modules
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    return { ...rtlRender };
  };

  it('should render a search box and all supported fields in the pattern', async () => {
    await renderTextBasedDataPanel();
    expect(screen.getByRole('searchbox', { name: 'Search field names' })).toBeInTheDocument();
    const availableFieldsList = screen.getByTestId('lnsTextBasedLanguagesAvailableFields');
    within(availableFieldsList)
      .getAllByTestId('lnsFieldListPanelField')
      .map((el, index) =>
        expect(within(el).getAllByRole('button')[1]).toHaveTextContent(
          ['bytes', 'memory', 'timestamp'][index]
        )
      );

    expect(screen.queryByTestId('lnsTextBasedLanguagesEmptyFields')).not.toBeInTheDocument();
    expect(screen.queryByTestId('lnsTextBasedLanguagesMetaFields')).not.toBeInTheDocument();
  });

  it('should not display the selected fields accordion if there are no fields displayed', async () => {
    await renderTextBasedDataPanel();
    expect(screen.queryByTestId('lnsTextBasedLanguagesSelectedFields')).not.toBeInTheDocument();
  });

  it('should display the selected fields accordion if there are fields displayed', async () => {
    await renderTextBasedDataPanel({ layerFields: ['memory'] });
    expect(screen.getByTestId('lnsTextBasedLanguagesSelectedFields')).toBeInTheDocument();
  });

  it('should list all supported fields in the pattern that match the search input', async () => {
    // Workaround for timeout via https://github.com/testing-library/user-event/issues/833#issuecomment-1171452841
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    await renderTextBasedDataPanel();
    jest.useFakeTimers();
    await user.type(screen.getByRole('searchbox', { name: 'Search field names' }), 'mem');
    act(() => jest.advanceTimersByTime(256));
    expect(screen.getByTestId('lnsFieldListPanelField')).toHaveTextContent('memory');
    jest.useRealTimers();
  });

  it('should render correct field type icons', async () => {
    await renderTextBasedDataPanel();
    const availableFieldsList = screen.getByTestId('lnsTextBasedLanguagesAvailableFields');
    expect(
      [
        ...availableFieldsList.querySelectorAll(
          '.unifiedFieldListItemButton__fieldIcon span[data-euiicon-type]'
        ),
      ].map((el) => el.getAttribute('data-euiicon-type'))
    ).toEqual(['tokenNumber', 'tokenNumber', 'tokenDate']);
  });
});
