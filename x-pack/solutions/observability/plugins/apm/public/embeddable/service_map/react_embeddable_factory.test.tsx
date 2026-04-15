/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { BehaviorSubject, Subject } from 'rxjs';
import { ENVIRONMENT_ALL } from '../../../common/environment_filter_values';
import { APM_SERVICE_MAP_EMBEDDABLE } from './constants';
import { getServiceMapEmbeddableFactory } from './react_embeddable_factory';
import type { EmbeddableDeps } from '../types';

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
      undefined,
      undefined,
      undefined,
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
});
