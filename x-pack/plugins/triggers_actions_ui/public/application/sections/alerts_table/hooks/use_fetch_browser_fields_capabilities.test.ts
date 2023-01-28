/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react-hooks';
import { useFetchBrowserFieldCapabilities } from './use_fetch_browser_fields_capabilities';
import { useKibana } from '../../../../common/lib/kibana';

jest.mock('../../../../common/lib/kibana');

describe('useFetchBrowserFieldCapabilities', () => {
  let httpMock: jest.Mock;

  beforeEach(() => {
    httpMock = useKibana().services.http.get as jest.Mock;
    httpMock.mockReturnValue({ fakeCategory: {} });
  });

  afterEach(() => {
    httpMock.mockReset();
  });

  it('should not fetch for siem', () => {
    const { result } = renderHook(() => useFetchBrowserFieldCapabilities({ featureIds: ['siem'] }));

    expect(httpMock).toHaveBeenCalledTimes(0);
    expect(result.current).toEqual([false, {}]);
  });

  it('should call the api only once', async () => {
    const { result, waitForNextUpdate, rerender } = renderHook(() =>
      useFetchBrowserFieldCapabilities({ featureIds: ['apm'] })
    );

    await waitForNextUpdate();

    expect(httpMock).toHaveBeenCalledTimes(1);
    expect(result.current).toEqual([false, { fakeCategory: {} }]);

    rerender();

    expect(httpMock).toHaveBeenCalledTimes(1);
    expect(result.current).toEqual([false, { fakeCategory: {} }]);
  });
});
