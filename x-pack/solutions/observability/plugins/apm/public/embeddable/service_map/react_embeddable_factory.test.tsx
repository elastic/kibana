/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { BehaviorSubject, Subject } from 'rxjs';
import {
  ENVIRONMENT_ALL,
  ENVIRONMENT_NOT_DEFINED,
} from '../../../common/environment_filter_values';
import { APM_SERVICE_MAP_EMBEDDABLE } from './constants';
import {
  getServiceMapEmbeddableFactory,
  mergeKueryQueries,
  type ServiceMapEmbeddableApi,
} from './react_embeddable_factory';
import type { EmbeddableDeps } from '../types';

describe('mergeKueryQueries', () => {
  it('returns empty string when both inputs are empty', () => {
    expect(mergeKueryQueries(undefined, undefined)).toBe('');
    expect(mergeKueryQueries(undefined, '')).toBe('');
    expect(mergeKueryQueries(undefined, '  ')).toBe('');
  });

  it('returns panel kuery when no dashboard query', () => {
    expect(mergeKueryQueries(undefined, 'service.name: api')).toBe('service.name: api');
    expect(mergeKueryQueries(undefined, '  service.name: api  ')).toBe('service.name: api');
  });

  it('returns dashboard query when no panel kuery', () => {
    expect(mergeKueryQueries({ query: 'host.name: server1', language: 'kuery' }, '')).toBe(
      'host.name: server1'
    );
    expect(
      mergeKueryQueries({ query: '  host.name: server1  ', language: 'kuery' }, undefined)
    ).toBe('host.name: server1');
  });

  it('combines panel and dashboard queries with "and"', () => {
    expect(
      mergeKueryQueries({ query: 'host.name: server1', language: 'kuery' }, 'service.name: api')
    ).toBe('service.name: api and host.name: server1');
  });

  it('handles empty dashboard query object', () => {
    expect(mergeKueryQueries({ query: '', language: 'kuery' }, 'service.name: api')).toBe(
      'service.name: api'
    );
    expect(mergeKueryQueries({ query: '  ', language: 'kuery' }, 'service.name: api')).toBe(
      'service.name: api'
    );
  });

  it('handles malformed query objects gracefully', () => {
    expect(mergeKueryQueries({} as any, 'service.name: api')).toBe('service.name: api');
    expect(mergeKueryQueries({ query: null } as any, 'service.name: api')).toBe(
      'service.name: api'
    );
  });

  it('ignores AggregateQuery (ES|QL) and returns panel kuery only', () => {
    expect(mergeKueryQueries({ esql: 'FROM logs' }, 'service.name: api')).toBe('service.name: api');
    expect(mergeKueryQueries({ esql: 'FROM logs' }, '')).toBe('');
  });
});

const mockApiPublishesUnifiedSearch = jest.fn();
const mockInitializeTitleManager = jest.fn();
const mockInitializeUnsavedChanges = jest.fn();
const mockUseBatchedPublishingSubjects = jest.fn();
const mockUseObservable = jest.fn();
const mockServiceMapEmbeddable = jest.fn();
const mockApmEmbeddableContext = jest.fn();

jest.mock('@kbn/presentation-publishing', () => ({
  apiPublishesUnifiedSearch: (...args: unknown[]) => mockApiPublishesUnifiedSearch(...args),
  initializeTitleManager: (...args: unknown[]) => mockInitializeTitleManager(...args),
  initializeUnsavedChanges: (...args: unknown[]) => mockInitializeUnsavedChanges(...args),
  titleComparators: { title: 'referenceEquality' },
  useBatchedPublishingSubjects: (...args: unknown[]) => mockUseBatchedPublishingSubjects(...args),
}));

jest.mock('react-use/lib/useObservable', () => ({
  __esModule: true,
  default: (...args: unknown[]) => mockUseObservable(...args),
}));

jest.mock('../embeddable_context', () => ({
  ApmEmbeddableContext: (props: Record<string, unknown>) => {
    mockApmEmbeddableContext(props);
    return <>{props.children as React.ReactNode}</>;
  },
}));

jest.mock('./service_map_embeddable', () => ({
  ServiceMapEmbeddable: (props: Record<string, unknown>) => {
    mockServiceMapEmbeddable(props);
    return null;
  },
}));

describe('getServiceMapEmbeddableFactory', () => {
  let titleAnyStateChange$: Subject<void>;

  beforeEach(() => {
    jest.clearAllMocks();
    titleAnyStateChange$ = new Subject<void>();
    mockInitializeTitleManager.mockReturnValue({
      api: { titleApi: true },
      getLatestState: jest.fn(() => ({ title: 'Saved title' })),
      anyStateChange$: titleAnyStateChange$,
      reinitializeState: jest.fn(),
    });
    mockInitializeUnsavedChanges.mockImplementation(() => ({ unsavedApi: true }));
    mockApiPublishesUnifiedSearch.mockReturnValue(true);
    mockUseObservable.mockReturnValue({ query: 'transaction.type: request' });
    mockUseBatchedPublishingSubjects.mockReturnValue([
      undefined,
      undefined,
      undefined,
      '',
      undefined,
      undefined,
    ]);
  });

  it('builds embeddable api and serializes default values', async () => {
    const finalizeApi = jest.fn((api) => api);
    const parentApi = { query$: new BehaviorSubject({ query: 'dashboard query' }) };
    const deps = { coreStart: { application: {} } } as unknown as EmbeddableDeps;
    const factory = getServiceMapEmbeddableFactory(deps);

    expect(factory.type).toBe(APM_SERVICE_MAP_EMBEDDABLE);

    const embeddable = await factory.buildEmbeddable({
      initialState: {},
      finalizeApi,
      uuid: 'panel-1',
      parentApi,
    } as never);

    expect(finalizeApi).toHaveBeenCalledWith(
      expect.objectContaining({
        titleApi: true,
        unsavedApi: true,
        serializeState: expect.any(Function),
        isEditingEnabled: expect.any(Function),
        onEdit: expect.any(Function),
        getTypeDisplayName: expect.any(Function),
        blockingError$: expect.any(Object),
      })
    );
    expect(embeddable.api.serializeState()).toEqual({
      title: 'Saved title',
      rangeFrom: 'now-15m',
      rangeTo: 'now',
      environment: ENVIRONMENT_ALL.value,
      kuery: '',
      serviceName: undefined,
      serviceGroupId: undefined,
    });
  });

  it('exposes blockingError$ initialized to undefined', async () => {
    const finalizeApi = jest.fn((api) => api);
    const parentApi = { query$: new BehaviorSubject({ query: '' }) };
    const deps = { coreStart: { application: {} } } as unknown as EmbeddableDeps;
    const factory = getServiceMapEmbeddableFactory(deps);

    const embeddable = await factory.buildEmbeddable({
      initialState: {},
      finalizeApi,
      uuid: 'panel-1',
      parentApi,
    } as never);

    expect(embeddable.api.blockingError$).toBeDefined();
    expect(embeddable.api.blockingError$.getValue()).toBeUndefined();
  });

  it('exposes edit capabilities', async () => {
    const finalizeApi = jest.fn((api) => api);
    const parentApi = { query$: new BehaviorSubject({ query: '' }) };
    const deps = { coreStart: { application: {} } } as unknown as EmbeddableDeps;
    const factory = getServiceMapEmbeddableFactory(deps);

    const embeddable = await factory.buildEmbeddable({
      initialState: {},
      finalizeApi,
      uuid: 'panel-1',
      parentApi,
    } as never);

    expect(embeddable.api.isEditingEnabled()).toBe(true);
    expect(embeddable.api.getTypeDisplayName()).toBe('configuration');
    expect(typeof embeddable.api.onEdit).toBe('function');
  });

  it('combines panel and dashboard kuery and passes state to rendered components', async () => {
    mockUseBatchedPublishingSubjects.mockReturnValue([
      'now-1h',
      'now',
      'production',
      'service.name: api',
      'checkout',
      'group-1',
    ]);

    const finalizeApi = jest.fn((api) => api);
    const parentApi = { query$: new BehaviorSubject({ query: 'transaction.type: request' }) };
    const deps = {
      coreStart: { application: { getUrlForApp: jest.fn() } },
    } as unknown as EmbeddableDeps;
    const factory = getServiceMapEmbeddableFactory(deps);
    const embeddable = await factory.buildEmbeddable({
      initialState: {},
      finalizeApi,
      uuid: 'panel-1',
      parentApi,
    } as never);

    render(<embeddable.Component />);

    expect(mockApmEmbeddableContext).toHaveBeenCalledWith(
      expect.objectContaining({
        deps,
        rangeFrom: 'now-1h',
        rangeTo: 'now',
        kuery: 'service.name: api and transaction.type: request',
      })
    );
    expect(mockServiceMapEmbeddable).toHaveBeenCalledWith(
      expect.objectContaining({
        rangeFrom: 'now-1h',
        rangeTo: 'now',
        environment: 'production',
        kuery: 'service.name: api and transaction.type: request',
        serviceName: 'checkout',
        serviceGroupId: 'group-1',
        core: deps.coreStart,
      })
    );
  });

  it('supports reset behavior and dashboard-query opt out', async () => {
    mockApiPublishesUnifiedSearch.mockReturnValue(false);
    mockUseObservable.mockReturnValue(undefined);
    mockUseBatchedPublishingSubjects.mockReturnValue([
      'now-15m',
      'now',
      ENVIRONMENT_ALL.value,
      '  host.name: app-1  ',
      null,
      null,
    ]);

    const finalizeApi = jest.fn((api) => api);
    const parentApi = { query$: new BehaviorSubject({ query: 'ignored' }) };
    const factory = getServiceMapEmbeddableFactory({ coreStart: {} } as unknown as EmbeddableDeps);
    const embeddable = await factory.buildEmbeddable({
      initialState: {
        rangeFrom: 'now-24h',
        rangeTo: 'now-1h',
        environment: 'staging',
        kuery: 'service.environment: staging',
        serviceName: 'service-a',
        serviceGroupId: 'group-a',
      },
      finalizeApi,
      uuid: 'panel-2',
      parentApi,
    } as never);

    const unsavedConfig = mockInitializeUnsavedChanges.mock.calls[0][0];
    const stateChangeNotifications: unknown[] = [];
    const subscription = unsavedConfig.anyStateChange$.subscribe((value: unknown) => {
      stateChangeNotifications.push(value);
    });
    titleAnyStateChange$.next();
    expect(stateChangeNotifications).toEqual([undefined]);
    subscription.unsubscribe();

    expect(unsavedConfig.getComparators()).toEqual(
      expect.objectContaining({
        title: 'referenceEquality',
        rangeFrom: 'referenceEquality',
        serviceGroupId: 'referenceEquality',
      })
    );

    unsavedConfig.onReset({
      rangeFrom: 'now-30m',
      rangeTo: 'now',
      environment: 'qa',
      kuery: 'trace.id: 1',
      serviceName: 'service-b',
      serviceGroupId: 'group-b',
      title: 'Reset title',
    });
    expect(embeddable.api.serializeState()).toEqual({
      title: 'Saved title',
      rangeFrom: 'now-30m',
      rangeTo: 'now',
      environment: 'qa',
      kuery: 'trace.id: 1',
      serviceName: 'service-b',
      serviceGroupId: 'group-b',
    });

    // Reset to undefined (new panel state) - should default to custom time range
    unsavedConfig.onReset(undefined);
    expect(embeddable.api.serializeState()).toEqual({
      title: 'Saved title',
      rangeFrom: 'now-15m',
      rangeTo: 'now',
      environment: ENVIRONMENT_ALL.value,
      kuery: '',
      serviceName: undefined,
      serviceGroupId: undefined,
    });

    render(<embeddable.Component />);
    expect(mockServiceMapEmbeddable).toHaveBeenCalledWith(
      expect.objectContaining({
        kuery: 'host.name: app-1',
        rangeFrom: 'now-15m',
        rangeTo: 'now',
        serviceName: undefined,
        serviceGroupId: undefined,
      })
    );
  });

  it('defaults to now-15m when initialState has undefined time range', async () => {
    mockApiPublishesUnifiedSearch.mockReturnValue(false);
    mockUseBatchedPublishingSubjects.mockReturnValue([
      'now-15m',
      'now',
      ENVIRONMENT_ALL.value,
      '',
      undefined,
      undefined,
    ]);

    const finalizeApi = jest.fn((api) => api);
    const parentApi = {
      query$: new BehaviorSubject({ query: '' }),
    };
    const factory = getServiceMapEmbeddableFactory({ coreStart: {} } as unknown as EmbeddableDeps);
    const embeddable = await factory.buildEmbeddable({
      initialState: {
        rangeFrom: undefined,
        rangeTo: undefined,
      },
      finalizeApi,
      uuid: 'panel-3',
      parentApi,
    } as never);

    expect(embeddable.api.timeRange$.getValue()).toEqual({
      from: 'now-15m',
      to: 'now',
    });
    expect(embeddable.api.serializeState().rangeFrom).toBe('now-15m');
    expect(embeddable.api.serializeState().rangeTo).toBe('now');
  });

  it('exposes setTimeRange to update time range', async () => {
    const finalizeApi = jest.fn((api) => api);
    const parentApi = {
      query$: new BehaviorSubject({ query: '' }),
    };
    const factory = getServiceMapEmbeddableFactory({ coreStart: {} } as unknown as EmbeddableDeps);

    const embeddable = await factory.buildEmbeddable({
      initialState: {},
      finalizeApi,
      uuid: 'panel-4',
      parentApi,
    } as never);

    // New panel defaults to custom time range
    expect(embeddable.api.timeRange$.getValue()).toEqual({
      from: 'now-15m',
      to: 'now',
    });

    // Update to new time range
    embeddable.api.setTimeRange({ from: 'now-1h', to: 'now' });
    expect(embeddable.api.timeRange$.getValue()).toEqual({
      from: 'now-1h',
      to: 'now',
    });
    expect(embeddable.api.serializeState().rangeFrom).toBe('now-1h');
    expect(embeddable.api.serializeState().rangeTo).toBe('now');

    // setTimeRange(undefined) resets to defaults
    embeddable.api.setTimeRange(undefined);
    expect(embeddable.api.timeRange$.getValue()).toEqual({
      from: 'now-15m',
      to: 'now',
    });
    expect(embeddable.api.serializeState().rangeFrom).toBe('now-15m');
    expect(embeddable.api.serializeState().rangeTo).toBe('now');
  });

  describe('filter notification api', () => {
    async function buildEmbeddableWithApi(initialState = {}) {
      const finalizeApi = jest.fn((api) => api);
      const parentApi = { query$: new BehaviorSubject({ query: '' }) };
      const factory = getServiceMapEmbeddableFactory({
        coreStart: {},
      } as unknown as EmbeddableDeps);

      const embeddable = await factory.buildEmbeddable({
        initialState,
        finalizeApi,
        uuid: 'panel-1',
        parentApi,
      } as never);

      return embeddable.api as ServiceMapEmbeddableApi;
    }

    it('exposes query$ with panel kuery', async () => {
      const api = await buildEmbeddableWithApi({ kuery: 'service.name: my-service' });

      expect(api.query$).toBeDefined();
      expect(api.query$.getValue()).toEqual({
        query: 'service.name: my-service',
        language: 'kuery',
      });
    });

    it('exposes empty query$ when no kuery is set', async () => {
      const api = await buildEmbeddableWithApi({});

      expect(api.query$.getValue()).toBeUndefined();
    });

    it('exposes filters$ with service name filter', async () => {
      const api = await buildEmbeddableWithApi({ serviceName: 'checkout-service' });

      expect(api.filters$).toBeDefined();
      const filters = api.filters$.getValue();
      expect(filters).toHaveLength(1);
      expect(filters![0]).toMatchObject({
        meta: { key: 'service.name', type: 'phrase' },
        query: { match_phrase: { 'service.name': 'checkout-service' } },
      });
    });

    it('exposes filters$ with environment filter when not default', async () => {
      const api = await buildEmbeddableWithApi({ environment: 'production' });

      const filters = api.filters$.getValue();
      expect(filters).toHaveLength(1);
      expect(filters![0]).toMatchObject({
        meta: { key: 'service.environment', type: 'phrase' },
        query: { match_phrase: { 'service.environment': 'production' } },
      });
    });

    it('excludes environment filter for ENVIRONMENT_ALL', async () => {
      const api = await buildEmbeddableWithApi({ environment: ENVIRONMENT_ALL.value });

      const filters = api.filters$.getValue();
      expect(filters).toHaveLength(0);
    });

    it('handles ENVIRONMENT_NOT_DEFINED with missing field filter', async () => {
      const api = await buildEmbeddableWithApi({ environment: ENVIRONMENT_NOT_DEFINED.value });

      const filters = api.filters$.getValue();
      expect(filters).toHaveLength(1);
      expect(filters![0]).toMatchObject({
        meta: { key: 'service.environment', type: 'exists', negate: true },
        query: { exists: { field: 'service.environment' } },
      });
    });

    it('combines service name and environment filters', async () => {
      const api = await buildEmbeddableWithApi({
        serviceName: 'api-gateway',
        environment: 'staging',
      });

      const filters = api.filters$.getValue();
      expect(filters).toHaveLength(2);
    });

    it('exposes empty filters$ when no filters are configured', async () => {
      const api = await buildEmbeddableWithApi({});

      expect(api.filters$.getValue()).toHaveLength(0);
    });
  });
});
