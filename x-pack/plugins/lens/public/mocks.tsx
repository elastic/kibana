/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
// eslint-disable-next-line import/no-extraneous-dependencies
import { ReactWrapper } from 'enzyme';
// eslint-disable-next-line import/no-extraneous-dependencies
import { mountWithIntl as mount } from '@kbn/test/jest';
import { Observable, Subject } from 'rxjs';
import { coreMock } from 'src/core/public/mocks';
import moment from 'moment';
import { Provider } from 'react-redux';
import { act } from 'react-dom/test-utils';
import { ReactExpressionRendererProps } from 'src/plugins/expressions/public';
import { DeepPartial } from '@reduxjs/toolkit';
import { LensPublicStart } from '.';
import { visualizationTypes } from './xy_visualization/types';
import { navigationPluginMock } from '../../../../src/plugins/navigation/public/mocks';
import { LensAppServices } from './app_plugin/types';
import { DOC_TYPE } from '../common';
import { DataPublicPluginStart, esFilters, UI_SETTINGS } from '../../../../src/plugins/data/public';
import { dashboardPluginMock } from '../../../../src/plugins/dashboard/public/mocks';
import {
  LensByValueInput,
  LensSavedObjectAttributes,
  LensByReferenceInput,
} from './embeddable/embeddable';
import {
  mockAttributeService,
  createEmbeddableStateTransferMock,
} from '../../../../src/plugins/embeddable/public/mocks';
import { LensAttributeService } from './lens_attribute_service';
import { EmbeddableStateTransfer } from '../../../../src/plugins/embeddable/public';

import { makeConfigureStore, LensAppState, LensState } from './state_management/index';
import { getResolvedDateRange } from './utils';
import { presentationUtilPluginMock } from '../../../../src/plugins/presentation_util/public/mocks';
import { DatasourcePublicAPI, Datasource, Visualization, FramePublicAPI } from './types';

export function createMockVisualization(): jest.Mocked<Visualization> {
  return {
    id: 'TEST_VIS',
    clearLayer: jest.fn((state, _layerId) => state),
    removeLayer: jest.fn(),
    getLayerIds: jest.fn((_state) => ['layer1']),
    visualizationTypes: [
      {
        icon: 'empty',
        id: 'TEST_VIS',
        label: 'TEST',
        groupLabel: 'TEST_VISGroup',
      },
    ],
    getVisualizationTypeId: jest.fn((_state) => 'empty'),
    getDescription: jest.fn((_state) => ({ label: '' })),
    switchVisualizationType: jest.fn((_, x) => x),
    getSuggestions: jest.fn((_options) => []),
    initialize: jest.fn((_frame, _state?) => ({})),
    getConfiguration: jest.fn((props) => ({
      groups: [
        {
          groupId: 'a',
          groupLabel: 'a',
          layerId: 'layer1',
          supportsMoreColumns: true,
          accessors: [],
          filterOperations: jest.fn(() => true),
          dataTestSubj: 'mockVisA',
        },
      ],
    })),
    toExpression: jest.fn((_state, _frame) => null),
    toPreviewExpression: jest.fn((_state, _frame) => null),

    setDimension: jest.fn(),
    removeDimension: jest.fn(),
    getErrorMessages: jest.fn((_state) => undefined),
    renderDimensionEditor: jest.fn(),
  };
}

const visualizationMap = {
  vis: createMockVisualization(),
  vis2: createMockVisualization(),
};

export type DatasourceMock = jest.Mocked<Datasource> & {
  publicAPIMock: jest.Mocked<DatasourcePublicAPI>;
};

export function createMockDatasource(id: string): DatasourceMock {
  const publicAPIMock: jest.Mocked<DatasourcePublicAPI> = {
    datasourceId: id,
    getTableSpec: jest.fn(() => []),
    getOperationForColumnId: jest.fn(),
  };

  return {
    id: 'mockindexpattern',
    clearLayer: jest.fn((state, _layerId) => state),
    getDatasourceSuggestionsForField: jest.fn((_state, _item) => []),
    getDatasourceSuggestionsForVisualizeField: jest.fn((_state, _indexpatternId, _fieldName) => []),
    getDatasourceSuggestionsFromCurrentState: jest.fn((_state) => []),
    getPersistableState: jest.fn((x) => ({
      state: x,
      savedObjectReferences: [{ type: 'index-pattern', id: 'mockip', name: 'mockip' }],
    })),
    getPublicAPI: jest.fn().mockReturnValue(publicAPIMock),
    initialize: jest.fn((_state?) => Promise.resolve()),
    renderDataPanel: jest.fn(),
    renderLayerPanel: jest.fn(),
    toExpression: jest.fn((_frame, _state) => null),
    insertLayer: jest.fn((_state, _newLayerId) => {}),
    removeLayer: jest.fn((_state, _layerId) => {}),
    removeColumn: jest.fn((props) => {}),
    getLayers: jest.fn((_state) => []),
    uniqueLabels: jest.fn((_state) => ({})),
    renderDimensionTrigger: jest.fn(),
    renderDimensionEditor: jest.fn(),
    getDropProps: jest.fn(),
    onDrop: jest.fn(),

    // this is an additional property which doesn't exist on real datasources
    // but can be used to validate whether specific API mock functions are called
    publicAPIMock,
    getErrorMessages: jest.fn((_state) => undefined),
    checkIntegrity: jest.fn((_state) => []),
  };
}

const mockDatasource: DatasourceMock = createMockDatasource('testDatasource');
const mockDatasource2: DatasourceMock = createMockDatasource('testDatasource2');
const datasourceMap = {
  testDatasource2: mockDatasource2,
  testDatasource: mockDatasource,
};

export function createExpressionRendererMock(): jest.Mock<
  React.ReactElement,
  [ReactExpressionRendererProps]
> {
  return jest.fn((_) => <span />);
}

export type FrameMock = jest.Mocked<FramePublicAPI>;
export function createMockFramePublicAPI(): FrameMock {
  return {
    datasourceLayers: {},
    dateRange: { fromDate: 'now-7d', toDate: 'now' },
    query: { query: '', language: 'lucene' },
    filters: [],
    searchSessionId: 'sessionId',
  };
}

export type Start = jest.Mocked<LensPublicStart>;

const createStartContract = (): Start => {
  const startContract: Start = {
    EmbeddableComponent: jest.fn(() => {
      return <span>Lens Embeddable Component</span>;
    }),
    SaveModalComponent: jest.fn(() => {
      return <span>Lens Save Modal Component</span>;
    }),
    canUseEditor: jest.fn(() => true),
    navigateToPrefilledEditor: jest.fn(),
    getXyVisTypes: jest.fn().mockReturnValue(new Promise((resolve) => resolve(visualizationTypes))),
  };
  return startContract;
};

export const lensPluginMock = {
  createStartContract,
};

export const defaultDoc = ({
  savedObjectId: '1234',
  title: 'An extremely cool default document!',
  expression: 'definitely a valid expression',
  state: {
    query: 'kuery',
    filters: [{ query: { match_phrase: { src: 'test' } } }],
    datasourceStates: {
      testDatasource: 'datasource',
    },
  },
  references: [{ type: 'index-pattern', id: '1', name: 'index-pattern-0' }],
} as unknown) as Document;

export function createMockTimefilter() {
  const unsubscribe = jest.fn();

  let timeFilter = { from: 'now-7d', to: 'now' };
  let subscriber: () => void;
  return {
    getTime: jest.fn(() => timeFilter),
    setTime: jest.fn((newTimeFilter) => {
      timeFilter = newTimeFilter;
      if (subscriber) {
        subscriber();
      }
    }),
    getTimeUpdate$: () => ({
      subscribe: ({ next }: { next: () => void }) => {
        subscriber = next;
        return unsubscribe;
      },
    }),
    calculateBounds: jest.fn(() => ({
      min: moment('2021-01-10T04:00:00.000Z'),
      max: moment('2021-01-10T08:00:00.000Z'),
    })),
    getBounds: jest.fn(() => timeFilter),
    getRefreshInterval: () => {},
    getRefreshIntervalDefaults: () => {},
    getAutoRefreshFetch$: () => new Observable(),
  };
}

export function mockDataPlugin(sessionIdSubject = new Subject<string>()) {
  function createMockSearchService() {
    let sessionIdCounter = 1;
    return {
      session: {
        start: jest.fn(() => `sessionId-${sessionIdCounter++}`),
        clear: jest.fn(),
        getSessionId: jest.fn(() => `sessionId-${sessionIdCounter}`),
        getSession$: jest.fn(() => sessionIdSubject.asObservable()),
      },
    };
  }

  function createMockFilterManager() {
    const unsubscribe = jest.fn();

    let subscriber: () => void;
    let filters: unknown = [];

    return {
      getUpdates$: () => ({
        subscribe: ({ next }: { next: () => void }) => {
          subscriber = next;
          return unsubscribe;
        },
      }),
      setFilters: jest.fn((newFilters: unknown[]) => {
        filters = newFilters;
        if (subscriber) subscriber();
      }),
      setAppFilters: jest.fn((newFilters: unknown[]) => {
        filters = newFilters;
        if (subscriber) subscriber();
      }),
      getFilters: () => filters,
      getGlobalFilters: () => {
        // @ts-ignore
        return filters.filter(esFilters.isFilterPinned);
      },
      removeAll: () => {
        filters = [];
        subscriber();
      },
    };
  }

  function createMockQueryString() {
    return {
      getQuery: jest.fn(() => ({ query: '', language: 'lucene' })),
      setQuery: jest.fn(),
      getDefaultQuery: jest.fn(() => ({ query: '', language: 'lucene' })),
    };
  }
  return ({
    query: {
      filterManager: createMockFilterManager(),
      timefilter: {
        timefilter: createMockTimefilter(),
      },
      queryString: createMockQueryString(),
      state$: new Observable(),
    },
    indexPatterns: {
      get: jest.fn((id) => {
        return new Promise((resolve) => resolve({ id }));
      }),
    },
    search: createMockSearchService(),
    nowProvider: {
      get: jest.fn(),
    },
    fieldFormats: {
      deserialize: jest.fn(),
    },
  } as unknown) as DataPublicPluginStart;
}

export function makeDefaultServices(
  sessionIdSubject = new Subject<string>(),
  doc = defaultDoc
): jest.Mocked<LensAppServices> {
  const core = coreMock.createStart({ basePath: '/testbasepath' });
  core.uiSettings.get.mockImplementation(
    jest.fn((type) => {
      if (type === UI_SETTINGS.TIMEPICKER_TIME_DEFAULTS) {
        return { from: 'now-7d', to: 'now' };
      } else if (type === UI_SETTINGS.SEARCH_QUERY_LANGUAGE) {
        return 'kuery';
      } else if (type === 'state:storeInSessionStorage') {
        return false;
      } else {
        return [];
      }
    })
  );

  const navigationStartMock = navigationPluginMock.createStartContract();

  jest.spyOn(navigationStartMock.ui.TopNavMenu.prototype, 'constructor').mockImplementation(() => {
    return <div className="topNavMenu" />;
  });

  function makeAttributeService(): LensAttributeService {
    const attributeServiceMock = mockAttributeService<
      LensSavedObjectAttributes,
      LensByValueInput,
      LensByReferenceInput
    >(
      DOC_TYPE,
      {
        saveMethod: jest.fn(),
        unwrapMethod: jest.fn(),
        checkForDuplicateTitle: jest.fn(),
      },
      core
    );

    attributeServiceMock.unwrapAttributes = jest.fn().mockResolvedValue(doc);
    attributeServiceMock.wrapAttributes = jest.fn().mockResolvedValue({
      savedObjectId: ((doc as unknown) as LensByReferenceInput).savedObjectId,
    });

    return attributeServiceMock;
  }

  return {
    http: core.http,
    chrome: core.chrome,
    overlays: core.overlays,
    uiSettings: core.uiSettings,
    navigation: navigationStartMock,
    notifications: core.notifications,
    attributeService: makeAttributeService(),
    dashboard: dashboardPluginMock.createStartContract(),
    presentationUtil: presentationUtilPluginMock.createStartContract(core),
    savedObjectsClient: core.savedObjects.client,
    dashboardFeatureFlag: { allowByValueEmbeddables: false },
    stateTransfer: createEmbeddableStateTransferMock() as EmbeddableStateTransfer,
    getOriginatingAppName: jest.fn(() => 'defaultOriginatingApp'),
    application: {
      ...core.application,
      capabilities: {
        ...core.application.capabilities,
        visualize: { save: true, saveQuery: true, show: true },
      },
      getUrlForApp: jest.fn((appId: string) => `/testbasepath/app/${appId}#/`),
    },
    data: mockDataPlugin(sessionIdSubject),
    storage: {
      get: jest.fn(),
      set: jest.fn(),
      remove: jest.fn(),
      clear: jest.fn(),
    },
  };
}

export const defaultState = {
  searchSessionId: 'sessionId-1',
  filters: [],
  query: { language: 'lucene', query: '' },
  resolvedDateRange: { fromDate: '2021-01-10T04:00:00.000Z', toDate: '2021-01-10T08:00:00.000Z' },
  isFullscreenDatasource: false,
  isSaveable: false,
  isLoading: false,
  isLinkedToOriginatingApp: false,
  activeDatasourceId: 'testDatasource',
  visualization: {
    state: {},
    activeId: 'testVis',
  },
  datasourceStates: {
    testDatasource: {
      isLoading: false,
      state: '',
    },
  },
};

export function makeLensStore({
  data,
  preloadedState,
  dispatch,
}: {
  data?: DataPublicPluginStart;
  preloadedState?: Partial<LensAppState>;
  dispatch?: jest.Mock;
}) {
  if (!data) {
    data = mockDataPlugin();
  }
  const lensStore = makeConfigureStore(
    {
      lensServices: { ...makeDefaultServices(), data },
      datasourceMap,
      visualizationMap,
    },
    {
      lens: {
        ...defaultState,
        searchSessionId: data.search.session.start(),
        query: data.query.queryString.getQuery(),
        filters: data.query.filterManager.getGlobalFilters(),
        resolvedDateRange: getResolvedDateRange(data.query.timefilter.timefilter),
        ...preloadedState,
      },
    } as DeepPartial<LensState>
  );

  const origDispatch = lensStore.dispatch;
  lensStore.dispatch = jest.fn(dispatch || origDispatch);
  return lensStore;
}

export const mountWithProvider = async (
  component: React.ReactElement,
  store?: {
    data?: DataPublicPluginStart;
    preloadedState?: Partial<LensAppState>;
    dispatch?: jest.Mock;
  },
  options?: {
    wrappingComponent?: React.FC<{
      children: React.ReactNode;
    }>;
    attachTo?: HTMLElement;
  }
) => {
  const lensStore = makeLensStore(store || {});

  let wrappingComponent: React.FC<{
    children: React.ReactNode;
  }> = ({ children }) => <Provider store={lensStore}>{children}</Provider>;

  let restOptions: {
    attachTo?: HTMLElement | undefined;
  };
  if (options) {
    const { wrappingComponent: _wrappingComponent, ...rest } = options;
    restOptions = rest;

    if (_wrappingComponent) {
      wrappingComponent = ({ children }) => {
        return _wrappingComponent({
          children: <Provider store={lensStore}>{children}</Provider>,
        });
      };
    }
  }

  let instance: ReactWrapper = {} as ReactWrapper;

  await act(async () => {
    instance = mount(component, ({
      wrappingComponent,
      ...restOptions,
    } as unknown) as ReactWrapper);
  });
  return { instance, lensStore };
};
