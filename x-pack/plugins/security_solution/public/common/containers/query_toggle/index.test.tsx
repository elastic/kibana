/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  renderHook,
  act,
  RenderResult,
  WaitForNextUpdate,
  cleanup,
} from '@testing-library/react-hooks';
import { QueryToggle, useQueryToggle } from '.';
import { RouteSpyState } from '../../utils/route/types';
import { SecurityPageName } from '../../../../common/constants';
import { useKibana } from '../../lib/kibana';

const mockRouteSpy: RouteSpyState = {
  pageName: SecurityPageName.overview,
  detailName: undefined,
  tabName: undefined,
  search: '',
  pathName: '/',
};
jest.mock('../../lib/kibana');
jest.mock('../../utils/route/use_route_spy', () => ({
  useRouteSpy: () => [mockRouteSpy],
}));

describe('useQueryToggle', () => {
  let result: RenderResult<QueryToggle>;
  let waitForNextUpdate: WaitForNextUpdate;
  const mockSet = jest.fn();
  beforeAll(() => {
    (useKibana as jest.Mock).mockReturnValue({
      services: {
        storage: {
          get: () => true,
          set: mockSet,
        },
      },
    });
  });
  beforeEach(() => {
    jest.clearAllMocks();
  });
  it('Toggles local storage', async () => {
    await act(async () => {
      ({ result, waitForNextUpdate } = renderHook(() => useQueryToggle('queryId')));
      await waitForNextUpdate();
      expect(result.current.toggleStatus).toEqual(true);
    });
    act(() => {
      result.current.setToggleStatus(false);
    });
    expect(result.current.toggleStatus).toEqual(false);
    expect(mockSet).toBeCalledWith('kibana.siem:queryId.query.toggle:overview', false);
    cleanup();
  });
  it('null storage key, do not set', async () => {
    await act(async () => {
      ({ result, waitForNextUpdate } = renderHook(() => useQueryToggle()));
      await waitForNextUpdate();
      expect(result.current.toggleStatus).toEqual(true);
    });
    act(() => {
      result.current.setToggleStatus(false);
    });
    expect(mockSet).not.toBeCalled();
    cleanup();
  });
});
