/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Observable, Subject } from 'rxjs';
import { act } from 'react-dom/test-utils';
import { loadDocument } from './mounter';
import { LensAppServices } from './types';
import { Document } from '../persistence';
import { DOC_TYPE } from '../../common';
import { VisualizeFieldContext } from 'src/plugins/ui_actions/public';
import { DataPublicPluginStart, esFilters } from '../../../../../src/plugins/data/public';
import { navigationPluginMock } from '../../../../../src/plugins/navigation/public/mocks';
import { coreMock } from 'src/core/public/mocks';
import {
  LensByValueInput,
  LensSavedObjectAttributes,
  LensByReferenceInput,
  LensEmbeddableInput,
} from '../editor_frame_service/embeddable/embeddable';
import {
  mockAttributeService,
  createEmbeddableStateTransferMock,
} from '../../../../../src/plugins/embeddable/public/mocks';
import { LensAttributeService } from '../lens_attribute_service';
import { EmbeddableStateTransfer } from '../../../../../src/plugins/embeddable/public';
import moment from 'moment';

import { makeConfigureStore, getPreloadedState } from '../state_management/index';
import { getResolvedDateRange } from '../utils';

const navigationStartMock = navigationPluginMock.createStartContract();

const sessionIdSubject = new Subject<string>();

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
    getQuery: jest.fn(() => ({ query: '', language: 'kuery' })),
    setQuery: jest.fn(),
    getDefaultQuery: jest.fn(() => ({ query: '', language: 'kuery' })),
  };
}

function createMockTimefilter() {
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

// todo: extract mocks to reuse in App, mounter, editorFrame

describe('Mounter', () => {
  let core: ReturnType<typeof coreMock['createStart']>;
  let defaultDoc: Document;
  let defaultSavedObjectId: string;

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
    attributeServiceMock.unwrapAttributes = jest.fn().mockResolvedValue(defaultDoc);
    attributeServiceMock.wrapAttributes = jest
      .fn()
      .mockResolvedValue({ savedObjectId: defaultSavedObjectId });
    return attributeServiceMock;
  }

  function makeDefaultServices(): jest.Mocked<LensAppServices> {
    return {
      http: core.http,
      chrome: core.chrome,
      overlays: core.overlays,
      uiSettings: core.uiSettings,
      navigation: navigationStartMock,
      notifications: core.notifications,
      attributeService: makeAttributeService(),
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
      data: ({
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
      } as unknown) as DataPublicPluginStart,
      storage: {
        get: jest.fn(),
        set: jest.fn(),
        remove: jest.fn(),
        clear: jest.fn(),
      },
    };
  }

  function mockLensStore({
    services: incomingServices,
    storeProps,
  }: {
    services?: jest.Mocked<LensAppServices>;
    storeProps?: {
      initialContext?: VisualizeFieldContext | undefined;
      isLinkedToOriginatingApp?: boolean;
    };
  }) {
    const services = incomingServices ?? makeDefaultServices();

    const lensStore = makeConfigureStore(
      getPreloadedState({
        query: services.data.query.queryString.getQuery(),
        filters: services.data.query.filterManager.getGlobalFilters(),
        searchSessionId: services.data.search.session.start(),
        isLinkedToOriginatingApp: !!storeProps?.isLinkedToOriginatingApp,
        resolvedDateRange: getResolvedDateRange(services.data.query.timefilter.timefilter),
      }),
      {
        data: services.data,
      }
    );

    const origDispatch = lensStore.dispatch;
    lensStore.dispatch = jest.fn(origDispatch);
    return { lensStore, services };
  }

  beforeEach(() => {
    core = coreMock.createStart({ basePath: '/testbasepath' });
    defaultSavedObjectId = '1234';
    defaultDoc = ({
      savedObjectId: defaultSavedObjectId,
      title: 'An extremely cool default document!',
      expression: 'definitely a valid expression',
      state: {
        query: 'kuery',
        filters: [{ query: { match_phrase: { src: 'test' } } }],
      },
      references: [{ type: 'index-pattern', id: '1', name: 'index-pattern-0' }],
    } as unknown) as Document;
  });

  describe('loadDocument', () => {
    it('does not load a document if there is no initial input', async () => {
      const redirectCallback = jest.fn();
      const { services, lensStore } = mockLensStore({});
      await loadDocument(redirectCallback, undefined, services, lensStore);
      expect(services.attributeService.unwrapAttributes).not.toHaveBeenCalled();
    });

    it('loads a document and uses query and filters if initial input is provided', async () => {
      const redirectCallback = jest.fn();
      const { services, lensStore } = mockLensStore({});
      services.attributeService.unwrapAttributes = jest.fn().mockResolvedValue({
        savedObjectId: defaultSavedObjectId,
        state: {
          query: 'fake query',
          filters: [{ query: { match_phrase: { src: 'test' } } }],
        },
        references: [{ type: 'index-pattern', id: '1', name: 'index-pattern-0' }],
      });
      await act(async () => {
        await loadDocument(
          redirectCallback,
          { savedObjectId: defaultSavedObjectId } as LensEmbeddableInput,
          services,
          lensStore
        );
      });

      expect(services.attributeService.unwrapAttributes).toHaveBeenCalledWith({
        savedObjectId: defaultSavedObjectId,
      });

      expect(services.data.indexPatterns.get).toHaveBeenCalledWith('1');

      expect(services.data.query.filterManager.setAppFilters).toHaveBeenCalledWith([
        { query: { match_phrase: { src: 'test' } } },
      ]);

      expect(lensStore.getState()).toEqual({
        app: expect.objectContaining({
          persistedDoc: expect.objectContaining({
            savedObjectId: defaultSavedObjectId,
            state: expect.objectContaining({
              query: 'fake query',
              filters: [{ query: { match_phrase: { src: 'test' } } }],
            }),
          }),
        }),
      });
    });

    it('does not load documents on sequential renders unless the id changes', async () => {
      const redirectCallback = jest.fn();
      const { services, lensStore } = mockLensStore({});

      await act(async () => {
        await loadDocument(
          redirectCallback,
          { savedObjectId: defaultSavedObjectId } as LensEmbeddableInput,
          services,
          lensStore
        );
      });

      await act(async () => {
        await loadDocument(
          redirectCallback,
          { savedObjectId: defaultSavedObjectId } as LensEmbeddableInput,
          services,
          lensStore
        );
      });

      expect(services.attributeService.unwrapAttributes).toHaveBeenCalledTimes(1);

      await act(async () => {
        await loadDocument(
          redirectCallback,
          { savedObjectId: '5678' } as LensEmbeddableInput,
          services,
          lensStore
        );
      });

      expect(services.attributeService.unwrapAttributes).toHaveBeenCalledTimes(2);
    });

    it('handles document load errors', async () => {
      const redirectCallback = jest.fn();

      const { services, lensStore } = mockLensStore({});

      services.attributeService.unwrapAttributes = jest.fn().mockRejectedValue('failed to load');

      await act(async () => {
        await loadDocument(
          redirectCallback,
          { savedObjectId: defaultSavedObjectId } as LensEmbeddableInput,
          services,
          lensStore
        );
      });
      expect(services.attributeService.unwrapAttributes).toHaveBeenCalledWith({
        savedObjectId: defaultSavedObjectId,
      });
      expect(services.notifications.toasts.addDanger).toHaveBeenCalled();
      expect(redirectCallback).toHaveBeenCalled();
    });

    it('adds to the recently accessed list on load', async () => {
      const redirectCallback = jest.fn();

      const { services, lensStore } = mockLensStore({});
      await act(async () => {
        await loadDocument(
          redirectCallback,
          ({ savedObjectId: defaultSavedObjectId } as unknown) as LensEmbeddableInput,
          services,
          lensStore
        );
      });

      expect(services.chrome.recentlyAccessed.add).toHaveBeenCalledWith(
        '/app/lens#/edit/1234',
        'An extremely cool default document!',
        '1234'
      );
    });
  });
});
