/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MouseEvent } from 'react';
import { renderHook } from '@testing-library/react-hooks';
import { APP_UI_ID, SecurityPageName } from '@kbn/security-solution-plugin/common';
import { mockServices } from '../__mocks__/services.mock';
import { useGetLinkProps, useLinkProps } from './use_link_props';

jest.mock('../services');

const href = '/app/security/test';

const { getUrlForApp, navigateToUrl } = mockServices.application;
const mockNavigateToUrl = navigateToUrl as jest.MockedFunction<typeof navigateToUrl>;
const mockGetUrlForApp = getUrlForApp as jest.MockedFunction<typeof getUrlForApp>;
mockGetUrlForApp.mockReturnValue(href);

describe('useLinkProps', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return link props', async () => {
    const { result } = renderHook(useLinkProps);

    const linkProps = result.current;

    expect(linkProps).toEqual({ href, onClick: expect.any(Function) });
    expect(mockGetUrlForApp).toHaveBeenCalledTimes(1);
    expect(mockGetUrlForApp).toHaveBeenCalledWith(APP_UI_ID, {
      deepLinkId: undefined,
      path: undefined,
    });
  });

  it('should call navigate when clicked normally', async () => {
    const ev = { preventDefault: jest.fn() } as unknown as MouseEvent;
    const { result } = renderHook(useLinkProps);

    const { onClick } = result.current;
    onClick(ev);

    expect(mockNavigateToUrl).toHaveBeenCalledTimes(1);
    expect(mockNavigateToUrl).toHaveBeenCalledWith(href);
  });

  it('should not call navigate when clicked with modifiers', async () => {
    const ev = { preventDefault: jest.fn(), ctrlKey: true } as unknown as MouseEvent;
    const { result } = renderHook(useLinkProps);

    const { onClick } = result.current;
    onClick(ev);

    expect(mockNavigateToUrl).not.toHaveBeenCalled();
  });

  it('should return link props passing deepLink', async () => {
    const { result } = renderHook(useLinkProps, {
      initialProps: { deepLinkId: SecurityPageName.alerts },
    });

    const linkProps = result.current;

    expect(linkProps).toEqual({ href, onClick: expect.any(Function) });
    expect(mockGetUrlForApp).toHaveBeenCalledTimes(1);
    expect(mockGetUrlForApp).toHaveBeenCalledWith(APP_UI_ID, {
      deepLinkId: SecurityPageName.alerts,
      path: undefined,
    });
  });

  it('should return link props passing deepLink and path', async () => {
    const { result } = renderHook(useLinkProps, {
      initialProps: { deepLinkId: SecurityPageName.alerts, path: '/test' },
    });

    const linkProps = result.current;

    expect(linkProps).toEqual({ href, onClick: expect.any(Function) });
    expect(mockGetUrlForApp).toHaveBeenCalledTimes(1);
    expect(mockGetUrlForApp).toHaveBeenCalledWith(APP_UI_ID, {
      deepLinkId: SecurityPageName.alerts,
      path: '/test',
    });
  });
});

describe('useGetLinkProps', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return link props', async () => {
    const { result } = renderHook(useGetLinkProps);

    const linkProps = result.current({});

    expect(linkProps).toEqual({ href, onClick: expect.any(Function) });
    expect(mockGetUrlForApp).toHaveBeenCalledTimes(1);
    expect(mockGetUrlForApp).toHaveBeenCalledWith(APP_UI_ID, {
      deepLinkId: undefined,
      path: undefined,
    });
  });

  it('should call navigate when clicked normally', async () => {
    const ev = { preventDefault: jest.fn() } as unknown as MouseEvent;
    const { result } = renderHook(useGetLinkProps);

    const { onClick } = result.current({});
    onClick(ev);

    expect(mockNavigateToUrl).toHaveBeenCalledTimes(1);
    expect(mockNavigateToUrl).toHaveBeenCalledWith(href);
  });

  it('should not call navigate when clicked with modifiers', async () => {
    const ev = { preventDefault: jest.fn(), ctrlKey: true } as unknown as MouseEvent;
    const { result } = renderHook(useGetLinkProps);

    const { onClick } = result.current({});
    onClick(ev);

    expect(mockNavigateToUrl).not.toHaveBeenCalled();
  });

  it('should return link props passing deepLink', async () => {
    const { result } = renderHook(useGetLinkProps);

    const linkProps = result.current({ deepLinkId: SecurityPageName.alerts });

    expect(linkProps).toEqual({ href, onClick: expect.any(Function) });
    expect(mockGetUrlForApp).toHaveBeenCalledTimes(1);
    expect(mockGetUrlForApp).toHaveBeenCalledWith(APP_UI_ID, {
      deepLinkId: SecurityPageName.alerts,
      path: undefined,
    });
  });

  it('should return link props passing deepLink and path', async () => {
    const { result } = renderHook(useGetLinkProps);

    const linkProps = result.current({ deepLinkId: SecurityPageName.alerts, path: '/test' });

    expect(linkProps).toEqual({ href, onClick: expect.any(Function) });
    expect(mockGetUrlForApp).toHaveBeenCalledTimes(1);
    expect(mockGetUrlForApp).toHaveBeenCalledWith(APP_UI_ID, {
      deepLinkId: SecurityPageName.alerts,
      path: '/test',
    });
  });
});
