/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react-hooks';
import { useFetchBrowserFieldCapabilities } from './use_fetch_browser_fields_capabilities';
import { useKibana } from '../../../../common/lib/kibana';
import { BrowserFields } from '@kbn/rule-registry-plugin/common';
import { AlertsField } from '../../../../types';

jest.mock('../../../../common/lib/kibana');

const browserFields: BrowserFields = {
  kibana: {
    fields: {
      [AlertsField.uuid]: {
        category: 'kibana',
        name: AlertsField.uuid,
      },
      [AlertsField.name]: {
        category: 'kibana',
        name: AlertsField.name,
      },
      [AlertsField.reason]: {
        category: 'kibana',
        name: AlertsField.reason,
      },
    },
  },
};

describe('useFetchBrowserFieldCapabilities', () => {
  let httpMock: jest.Mock;

  beforeEach(() => {
    httpMock = useKibana().services.http.get as jest.Mock;
    httpMock.mockReturnValue({
      browserFields: { fakeCategory: {} },
      fields: [
        {
          name: 'fakeCategory',
        },
      ],
    });
  });

  afterEach(() => {
    httpMock.mockReset();
  });

  it('should not fetch for siem', () => {
    const { result } = renderHook(() => useFetchBrowserFieldCapabilities({ featureIds: ['siem'] }));

    expect(httpMock).toHaveBeenCalledTimes(0);
    expect(result.current).toEqual([undefined, {}, []]);
  });

  it('should call the api only once', async () => {
    const { result, waitForNextUpdate, rerender } = renderHook(() =>
      useFetchBrowserFieldCapabilities({ featureIds: ['apm'] })
    );

    await waitForNextUpdate();

    expect(httpMock).toHaveBeenCalledTimes(1);
    expect(result.current).toEqual([
      false,
      { fakeCategory: {} },
      [
        {
          name: 'fakeCategory',
        },
      ],
    ]);

    rerender();

    expect(httpMock).toHaveBeenCalledTimes(1);
    expect(result.current).toEqual([
      false,
      { fakeCategory: {} },
      [
        {
          name: 'fakeCategory',
        },
      ],
    ]);
  });

  it('should not fetch if browserFields have been provided', async () => {
    const { result } = renderHook(() =>
      useFetchBrowserFieldCapabilities({ featureIds: ['apm'], initialBrowserFields: browserFields })
    );

    expect(httpMock).toHaveBeenCalledTimes(0);
    expect(result.current).toEqual([undefined, browserFields, []]);
  });
});
