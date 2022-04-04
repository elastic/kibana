/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react-hooks';
import { useShowPagesWithEmptyView } from './use_show_pages_with_empty_view';

jest.mock('../route/use_route_spy', () => ({
  useRouteSpy: jest
    .fn()
    .mockImplementationOnce(() => [{ pageName: 'hosts' }])
    .mockImplementationOnce(() => [{ pageName: 'rules' }])
    .mockImplementationOnce(() => [{ pageName: 'network' }])
    .mockImplementationOnce(() => [{ pageName: 'get_started' }])
    .mockImplementationOnce(() => [{ pageName: 'get_started' }]),
}));
jest.mock('../../../common/containers/sourcerer', () => ({
  useSourcererDataView: jest
    .fn()
    .mockImplementationOnce(() => [{ indicesExist: false }])
    .mockImplementationOnce(() => [{ indicesExist: false }])
    .mockImplementationOnce(() => [{ indicesExist: true }])
    .mockImplementationOnce(() => [{ indicesExist: false }])
    .mockImplementationOnce(() => [{ indicesExist: true }]),
}));

describe('use show pages with empty view', () => {
  it('shows empty view when on an elligible page and indices do not exist', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook(() => useShowPagesWithEmptyView());
      await waitForNextUpdate();
      const emptyResult = result.current;
      expect(emptyResult).toEqual(true);
    });
  });
  it('does not show empty view when on an inelligible page and indices do not exist', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook(() => useShowPagesWithEmptyView());
      await waitForNextUpdate();
      const emptyResult = result.current;
      expect(emptyResult).toEqual(false);
    });
  });
  it('shows empty view when on an elligible page and indices do exist', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook(() => useShowPagesWithEmptyView());
      await waitForNextUpdate();
      const emptyResult = result.current;
      expect(emptyResult).toEqual(true);
    });
  });

  it('apply empty view for the landing page if indices do not exist', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook(() => useShowPagesWithEmptyView());
      await waitForNextUpdate();
      const emptyResult = result.current;
      expect(emptyResult).toEqual(true);
    });
  });

  it('apply empty view for the landing page if indices exist', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook(() => useShowPagesWithEmptyView());
      await waitForNextUpdate();
      const emptyResult = result.current;
      expect(emptyResult).toEqual(true);
    });
  });
});
