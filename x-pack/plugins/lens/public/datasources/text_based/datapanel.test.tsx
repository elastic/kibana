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
import { FieldButton } from '@kbn/react-field';

import { type TextBasedDataPanelProps, TextBasedDataPanel } from './datapanel';

import { coreMock } from '@kbn/core/public/mocks';
import type { TextBasedPrivateState } from './types';
import { mountWithIntl } from '@kbn/test-jest-helpers';

import { uiActionsPluginMock } from '@kbn/ui-actions-plugin/public/mocks';
import { createIndexPatternServiceMock } from '../../mocks/data_views_service_mock';
import { createMockFramePublicAPI } from '../../mocks';
import { createMockedDragDropContext } from './mocks';
import { DataViewsState } from '../../state_management';
import { ExistingFieldsMap, IndexPattern } from '../../types';

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

const initialState: TextBasedPrivateState = {
  layers: {
    first: {
      index: '1',
      columns: [],
      allColumns: [],
      query: { sql: 'SELECT * FROM foo' },
    },
  },
  indexPatternRefs: [
    { id: '1', title: 'my-fake-index-pattern' },
    { id: '2', title: 'my-fake-restricted-pattern' },
    { id: '3', title: 'my-compatible-pattern' },
  ],
  fieldList: fieldsFromQuery,
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
      getFieldByName: jest.fn(),
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

// @ts-expect-error Portal mocks are notoriously difficult to type
ReactDOM.createPortal = jest.fn((element) => element);

describe('TextBased Query Languages Data Panel', () => {
  let core: ReturnType<typeof coreMock['createStart']>;
  let dataViews: DataViewPublicStart;

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
      dragDropContext: createMockedDragDropContext(),
      core,
      dateRange: {
        fromDate: 'now-7d',
        toDate: 'now',
      },
      query: { sql: 'SELECT * FROM my-fake-index-pattern' } as unknown as Query,
      filters: [],
      showNoDataPopover: jest.fn(),
      dropOntoWorkspace: jest.fn(),
      hasSuggestionForField: jest.fn(() => false),
      uiActions: uiActionsPluginMock.createStartContract(),
      indexPatternService: createIndexPatternServiceMock({ core, dataViews }),
      frame: getFrameAPIMock(),
      state: initialState,
      setState: jest.fn(),
      onChangeIndexPattern: jest.fn(),
    };
  });

  it('should render a search box', async () => {
    const wrapper = mountWithIntl(<TextBasedDataPanel {...defaultProps} />);
    expect(wrapper.find('[data-test-subj="lnsTextBasedLangugesFieldSearch"]').length).toEqual(1);
  });

  it('should list all supported fields in the pattern', async () => {
    const wrapper = mountWithIntl(<TextBasedDataPanel {...defaultProps} />);
    expect(
      wrapper
        .find('[data-test-subj="lnsTextBasedLanguagesPanelFields"]')
        .find(FieldButton)
        .map((fieldItem) => fieldItem.prop('fieldName'))
    ).toEqual(['timestamp', 'bytes', 'memory']);
  });

  it('should not display the selected fields accordion if there are no fields displayed', async () => {
    const wrapper = mountWithIntl(<TextBasedDataPanel {...defaultProps} />);
    expect(wrapper.find('[data-test-subj="lnsSelectedFieldsTextBased"]').length).toEqual(0);
  });

  it('should display the selected fields accordion if there are fields displayed', async () => {
    const props = {
      ...defaultProps,
      layerFields: ['memory'],
    };
    const wrapper = mountWithIntl(<TextBasedDataPanel {...props} />);
    expect(wrapper.find('[data-test-subj="lnsSelectedFieldsTextBased"]').length).not.toEqual(0);
  });

  it('should list all supported fields in the pattern that match the search input', async () => {
    const wrapper = mountWithIntl(<TextBasedDataPanel {...defaultProps} />);
    const searchBox = wrapper.find('[data-test-subj="lnsTextBasedLangugesFieldSearch"]');

    act(() => {
      searchBox.prop('onChange')!({
        target: { value: 'mem' },
      } as React.ChangeEvent<HTMLInputElement>);
    });

    wrapper.update();
    expect(
      wrapper
        .find('[data-test-subj="lnsTextBasedLanguagesPanelFields"]')
        .find(FieldButton)
        .map((fieldItem) => fieldItem.prop('fieldName'))
    ).toEqual(['memory']);
  });
});
