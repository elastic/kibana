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
} from './editor_frame_service/embeddable/embeddable';
import {
  mockAttributeService,
  createEmbeddableStateTransferMock,
} from '../../../../src/plugins/embeddable/public/mocks';
import { LensAttributeService } from './lens_attribute_service';
import { EmbeddableStateTransfer } from '../../../../src/plugins/embeddable/public';

import { makeConfigureStore, getPreloadedState, LensAppState } from './state_management/index';
import { getResolvedDateRange } from './utils';
import { presentationUtilPluginMock } from '../../../../src/plugins/presentation_util/public/mocks';

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

export function mockLensStore({
  data,
  storePreloadedState,
}: {
  data: DataPublicPluginStart;
  storePreloadedState?: Partial<LensAppState>;
}) {
  const lensStore = makeConfigureStore(
    getPreloadedState({
      query: data.query.queryString.getQuery(),
      filters: data.query.filterManager.getGlobalFilters(),
      searchSessionId: data.search.session.start(),
      resolvedDateRange: getResolvedDateRange(data.query.timefilter.timefilter),
      ...storePreloadedState,
    }),
    {
      data,
    }
  );

  const origDispatch = lensStore.dispatch;
  lensStore.dispatch = jest.fn(origDispatch);
  return lensStore;
}

export const mountWithProvider = async (
  component: React.ReactElement,
  data: DataPublicPluginStart,
  storePreloadedState?: Partial<LensAppState>,
  extraWrappingComponent?: React.FC<{
    children: React.ReactNode;
  }>
) => {
  const lensStore = mockLensStore({ data, storePreloadedState });

  const wrappingComponent: React.FC<{
    children: React.ReactNode;
  }> = ({ children }) => {
    if (extraWrappingComponent) {
      return extraWrappingComponent({
        children: <Provider store={lensStore}>{children}</Provider>,
      });
    }
    return <Provider store={lensStore}>{children}</Provider>;
  };

  let instance: ReactWrapper = {} as ReactWrapper;

  await act(async () => {
    instance = mount(component, ({
      wrappingComponent,
    } as unknown) as ReactWrapper);
  });
  return { instance, lensStore };
};
