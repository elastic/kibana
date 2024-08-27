/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { reactRenderHook } from '@testing-library/react';

import type { DataStream } from '../types';
import * as useLocatorModule from '../../../hooks/use_locator';

import { useAPMServiceDetailHref } from './use_apm_service_href';

jest.mock('../../../hooks/use_locator', () => {
  const apmLocatorMock = { getUrl: jest.fn().mockResolvedValue('') };
  return {
    useLocator: () => apmLocatorMock,
  };
});
const apmLocatorMock = useLocatorModule.useLocator('APM_LOCATOR')?.getUrl;

describe('useApmServiceHref hook', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("doesn't call the apm locator when given a non APM datastream", async () => {
    const datastream = {
      package: 'elastic_agent',
    } as DataStream;

    const { result, waitForNextUpdate } = reactRenderHook(() =>
      useAPMServiceDetailHref(datastream)
    );

    await waitForNextUpdate();

    expect(result.current).toMatchObject({ isSuccessful: true, href: undefined });
    expect(apmLocatorMock).not.toBeCalled();
  });

  const testCases = [
    [
      {
        package: 'apm',
      },
      { serviceName: undefined },
    ],
    [
      {
        package: 'apm',
        type: 'metrics',
        serviceDetails: {
          serviceName: 'example-app',
          environment: 'example-environment',
        },
      },
      {
        serviceName: 'example-app',
        serviceOverviewTab: 'metrics',
        query: {
          environment: 'example-environment',
        },
      },
    ],
    [
      {
        package: 'apm',
        type: 'logs',
        serviceDetails: {
          serviceName: 'example-app',
          environment: 'example-environment',
        },
      },
      {
        serviceName: 'example-app',
        serviceOverviewTab: 'errors',
        query: {
          environment: 'example-environment',
        },
      },
    ],
  ] as unknown as Array<[DataStream, object]>;

  it.each(testCases)(
    'it passes the correct params to apm locator for %s',
    async (datastream, locatorParams) => {
      const { result, waitForNextUpdate } = reactRenderHook(() =>
        useAPMServiceDetailHref(datastream)
      );

      await waitForNextUpdate();

      expect(result.current).toMatchObject({ isSuccessful: true, href: '' });
      expect(apmLocatorMock).toBeCalledWith(expect.objectContaining(locatorParams));
    }
  );
});
