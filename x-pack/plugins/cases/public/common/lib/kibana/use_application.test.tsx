/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PublicAppInfo } from '@kbn/core-application-browser';
import { AppStatus } from '@kbn/core-application-browser';
import { renderHook } from '@testing-library/react-hooks';
import { BehaviorSubject, Subject } from 'rxjs';
import type { AppMockRenderer } from '../../mock';
import { createAppMockRenderer } from '../../mock';
import { useApplication } from './use_application';

describe('useApplication', () => {
  let appMockRender: AppMockRenderer;

  beforeEach(() => {
    jest.clearAllMocks();
    appMockRender = createAppMockRenderer();
  });

  const getApp = (props: Partial<PublicAppInfo> = {}): PublicAppInfo => ({
    id: 'testAppId',
    title: 'Test title',
    status: AppStatus.accessible,
    visibleIn: ['globalSearch'],
    appRoute: `/app/some-id`,
    keywords: [],
    deepLinks: [],
    ...props,
  });

  it('returns the appId and the appTitle correctly', () => {
    const { result } = renderHook(() => useApplication(), {
      wrapper: appMockRender.AppWrapper,
    });

    expect(result.current).toEqual({
      appId: 'testAppId',
      appTitle: 'Test',
    });
  });

  it('returns undefined appId and appTitle if the currentAppId observable is not defined', () => {
    appMockRender.coreStart.application.currentAppId$ = new Subject();

    const { result } = renderHook(() => useApplication(), {
      wrapper: appMockRender.AppWrapper,
    });

    expect(result.current).toEqual({});
  });

  it('returns undefined appTitle if the applications observable is not defined', () => {
    appMockRender.coreStart.application.applications$ = new Subject();

    const { result } = renderHook(() => useApplication(), {
      wrapper: appMockRender.AppWrapper,
    });

    expect(result.current).toEqual({
      appId: 'testAppId',
      appTitle: undefined,
    });
  });

  it('returns the label as appTitle', () => {
    appMockRender.coreStart.application.applications$ = new BehaviorSubject(
      new Map([['testAppId', getApp({ category: { id: 'test-label-id', label: 'Test label' } })]])
    );

    const { result } = renderHook(() => useApplication(), {
      wrapper: appMockRender.AppWrapper,
    });

    expect(result.current).toEqual({
      appId: 'testAppId',
      appTitle: 'Test label',
    });
  });

  it('returns the title as appTitle if the categories label is missing', () => {
    appMockRender.coreStart.application.applications$ = new BehaviorSubject(
      new Map([['testAppId', getApp({ title: 'Test title' })]])
    );

    const { result } = renderHook(() => useApplication(), {
      wrapper: appMockRender.AppWrapper,
    });

    expect(result.current).toEqual({
      appId: 'testAppId',
      appTitle: 'Test title',
    });
  });

  it('gets the value from the default value of the currentAppId observable if it exists', () => {
    appMockRender.coreStart.application.currentAppId$ = new BehaviorSubject('new-test-id');

    const { result } = renderHook(() => useApplication(), {
      wrapper: appMockRender.AppWrapper,
    });

    expect(result.current).toEqual({ appId: 'new-test-id' });
  });
});
