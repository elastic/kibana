/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createFleetTestRendererMock } from '../../../../../../mock';
import type { MockedFleetStartServices } from '../../../../../../mock';
import { useLicense } from '../../../../../../hooks/use_license';
import type { LicenseService } from '../../../../services';

import { useOutputOptions } from './hooks';

jest.mock('../../../../../../hooks/use_license');

const mockedUseLicence = useLicense as jest.MockedFunction<typeof useLicense>;

function defaultHttpClientGetImplementation(path: any) {
  if (typeof path !== 'string') {
    throw new Error('Invalid request');
  }
  const err = new Error(`API [GET ${path}] is not MOCKED!`);
  // eslint-disable-next-line no-console
  console.log(err);
  throw err;
}

const mockApiCallsWithOutputs = (http: MockedFleetStartServices['http']) => {
  http.get.mockImplementation(async (path) => {
    if (typeof path !== 'string') {
      throw new Error('Invalid request');
    }
    if (path === '/api/fleet/outputs') {
      return {
        data: {
          items: [
            {
              id: 'output1',
              name: 'Output 1',
              is_default: true,
              is_default_monitoring: true,
            },
            {
              id: 'output2',
              name: 'Output 2',
              is_default: true,
              is_default_monitoring: true,
            },
            {
              id: 'output3',
              name: 'Output 3',
              is_default: true,
              is_default_monitoring: true,
            },
          ],
        },
      };
    }

    return defaultHttpClientGetImplementation(path);
  });
};

describe('useOutputOptions', () => {
  it('should generate enabled options if the licence is platinium', async () => {
    const testRenderer = createFleetTestRendererMock();
    mockedUseLicence.mockReturnValue({
      hasAtLeast: () => true,
    } as unknown as LicenseService);
    mockApiCallsWithOutputs(testRenderer.startServices.http);
    const { result, waitForNextUpdate } = testRenderer.renderHook(() => useOutputOptions());
    expect(result.current.isLoading).toBeTruthy();

    await waitForNextUpdate();
    expect(result.current.dataOutputOptions).toMatchInlineSnapshot(`
      Array [
        Object {
          "inputDisplay": "Default (currently Output 1)",
          "value": "@@##DEFAULT_OUTPUT_VALUE##@@",
        },
        Object {
          "disabled": false,
          "inputDisplay": "Output 1",
          "value": "output1",
        },
        Object {
          "disabled": false,
          "inputDisplay": "Output 2",
          "value": "output2",
        },
        Object {
          "disabled": false,
          "inputDisplay": "Output 3",
          "value": "output3",
        },
      ]
    `);
    expect(result.current.monitoringOutputOptions).toMatchInlineSnapshot(`
      Array [
        Object {
          "inputDisplay": "Default (currently Output 1)",
          "value": "@@##DEFAULT_OUTPUT_VALUE##@@",
        },
        Object {
          "disabled": false,
          "inputDisplay": "Output 1",
          "value": "output1",
        },
        Object {
          "disabled": false,
          "inputDisplay": "Output 2",
          "value": "output2",
        },
        Object {
          "disabled": false,
          "inputDisplay": "Output 3",
          "value": "output3",
        },
      ]
    `);
  });

  it('should only enable the default options if the licence is not platinium', async () => {
    const testRenderer = createFleetTestRendererMock();
    mockedUseLicence.mockReturnValue({
      hasAtLeast: () => false,
    } as unknown as LicenseService);
    mockApiCallsWithOutputs(testRenderer.startServices.http);
    const { result, waitForNextUpdate } = testRenderer.renderHook(() => useOutputOptions());
    expect(result.current.isLoading).toBeTruthy();

    await waitForNextUpdate();
    expect(result.current.dataOutputOptions).toMatchInlineSnapshot(`
      Array [
        Object {
          "inputDisplay": "Default (currently Output 1)",
          "value": "@@##DEFAULT_OUTPUT_VALUE##@@",
        },
        Object {
          "disabled": true,
          "inputDisplay": "Output 1",
          "value": "output1",
        },
        Object {
          "disabled": true,
          "inputDisplay": "Output 2",
          "value": "output2",
        },
        Object {
          "disabled": true,
          "inputDisplay": "Output 3",
          "value": "output3",
        },
      ]
    `);
    expect(result.current.monitoringOutputOptions).toMatchInlineSnapshot(`
      Array [
        Object {
          "inputDisplay": "Default (currently Output 1)",
          "value": "@@##DEFAULT_OUTPUT_VALUE##@@",
        },
        Object {
          "disabled": true,
          "inputDisplay": "Output 1",
          "value": "output1",
        },
        Object {
          "disabled": true,
          "inputDisplay": "Output 2",
          "value": "output2",
        },
        Object {
          "disabled": true,
          "inputDisplay": "Output 3",
          "value": "output3",
        },
      ]
    `);
  });
});
