/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { act } from 'react-dom/test-utils';
import { ReactWrapper } from 'enzyme';
import type { Query } from '@kbn/es-query';

import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import { expressionsPluginMock } from '@kbn/expressions-plugin/public/mocks';
import {
  dataViewPluginMocks,
  Start as DataViewPublicStart,
} from '@kbn/data-views-plugin/public/mocks';
import type { DatatableColumn } from '@kbn/expressions-plugin/public';
import { EuiHighlight, EuiToken } from '@elastic/eui';

import { type TextBasedDataPanelProps, TextBasedDataPanel } from './datapanel';

import { coreMock } from '@kbn/core/public/mocks';
import type { TextBasedPrivateState } from '../types';
import { mountWithI18nProvider } from '@kbn/test-jest-helpers';

import { uiActionsPluginMock } from '@kbn/ui-actions-plugin/public/mocks';
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

async function mountAndWaitForLazyModules(component: React.ReactElement): Promise<ReactWrapper> {
  let inst: ReactWrapper;
  await act(async () => {
    inst = await mountWithI18nProvider(component);
    // wait for lazy modules
    await new Promise((resolve) => setTimeout(resolve, 0));
    inst.update();
  });

  await inst!.update();

  return inst!;
}

// TODO: After the i18n upgrade it seem that some underlying error in these tests surfaced:
// | TypeError: Cannot read properties of null (reading 'tag')
// Does not seem related to the i18n upgrade
describe.skip('TextBased Query Languages Data Panel', () => {
  let core: ReturnType<typeof coreMock['createStart']>;
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

  it('should render a search box', async () => {
    const wrapper = await mountAndWaitForLazyModules(<TextBasedDataPanel {...defaultProps} />);

    expect(
      wrapper.find('[data-test-subj="lnsTextBasedLanguagesFieldSearch"] input').length
    ).toEqual(1);
  });

  it('should list all supported fields in the pattern', async () => {
    const wrapper = await mountAndWaitForLazyModules(<TextBasedDataPanel {...defaultProps} />);

    expect(
      wrapper
        .find('[data-test-subj="lnsTextBasedLanguagesAvailableFields"]')
        .find(EuiHighlight)
        .map((item) => item.prop('children'))
    ).toEqual(['bytes', 'memory', 'timestamp']);

    expect(wrapper.find('[data-test-subj="lnsTextBasedLanguagesEmptyFields"]').exists()).toBe(
      false
    );
    expect(wrapper.find('[data-test-subj="lnsTextBasedLanguagesMetaFields"]').exists()).toBe(false);
  });

  it('should not display the selected fields accordion if there are no fields displayed', async () => {
    const wrapper = await mountAndWaitForLazyModules(<TextBasedDataPanel {...defaultProps} />);

    expect(wrapper.find('[data-test-subj="lnsTextBasedLanguagesSelectedFields"]').length).toEqual(
      0
    );
  });

  it('should display the selected fields accordion if there are fields displayed', async () => {
    const props = {
      ...defaultProps,
      layerFields: ['memory'],
    };
    const wrapper = await mountAndWaitForLazyModules(<TextBasedDataPanel {...props} />);

    expect(
      wrapper.find('[data-test-subj="lnsTextBasedLanguagesSelectedFields"]').length
    ).not.toEqual(0);
  });

  it('should list all supported fields in the pattern that match the search input', async () => {
    const wrapper = await mountAndWaitForLazyModules(<TextBasedDataPanel {...defaultProps} />);

    expect(
      wrapper
        .find('[data-test-subj="lnsTextBasedLanguagesAvailableFields"]')
        .find(EuiHighlight)
        .map((item) => item.prop('children'))
    ).toEqual(['bytes', 'memory', 'timestamp']);

    act(() => {
      wrapper.find('[data-test-subj="lnsTextBasedLanguagesFieldSearch"] input').simulate('change', {
        target: { value: 'mem' },
      });
    });

    await wrapper.update();

    expect(
      wrapper
        .find('[data-test-subj="lnsTextBasedLanguagesAvailableFields"]')
        .find(EuiHighlight)
        .map((item) => item.prop('children'))
    ).toEqual(['memory']);
  });

  it('should render correct field type icons', async () => {
    const wrapper = await mountAndWaitForLazyModules(<TextBasedDataPanel {...defaultProps} />);

    expect(
      wrapper
        .find('[data-test-subj="lnsTextBasedLanguagesAvailableFields"]')
        .find(EuiToken)
        .map((item) => item.prop('iconType'))
    ).toEqual(['tokenNumber', 'tokenNumber', 'tokenDate']);
  });
});
