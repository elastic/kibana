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
import type { AgentPolicy } from '../../../../types';

import { useOutputOptions, useFleetServerHostsOptions } from './hooks';

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
              is_default: false,
              is_default_monitoring: false,
            },
            {
              id: 'output3',
              name: 'Output 3',
              is_default: false,
              is_default_monitoring: false,
            },
          ],
        },
      };
    }

    return defaultHttpClientGetImplementation(path);
  });
};

const mockApiCallsWithLogstashOutputs = (http: MockedFleetStartServices['http']) => {
  http.get.mockImplementation(async (path) => {
    if (typeof path !== 'string') {
      throw new Error('Invalid request');
    }
    if (path === '/api/fleet/outputs') {
      return {
        data: {
          items: [
            {
              id: 'elasticsearch1',
              name: 'Elasticsearch1',
              is_default: false,
              type: 'elasticsearch',
              is_default_monitoring: false,
            },
            {
              id: 'logstash1',
              name: 'Logstash 1',
              type: 'logstash',
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

const mockApiCallsWithRemoteESOutputs = (http: MockedFleetStartServices['http']) => {
  http.get.mockImplementation(async (path) => {
    if (typeof path !== 'string') {
      throw new Error('Invalid request');
    }
    if (path === '/api/fleet/outputs') {
      return {
        data: {
          items: [
            {
              id: 'remote1',
              name: 'Remote1',
              type: 'remote_elasticsearch',
              is_default: false,
              is_default_monitoring: false,
            },
          ],
        },
      };
    }

    return defaultHttpClientGetImplementation(path);
  });
};

const mockApiCallsWithInternalOutputs = (http: MockedFleetStartServices['http']) => {
  http.get.mockImplementation(async (path) => {
    if (typeof path !== 'string') {
      throw new Error('Invalid request');
    }
    if (path === '/api/fleet/outputs') {
      return {
        data: {
          items: [
            {
              id: 'default-output',
              name: 'Default',
              type: 'elasticsearch',
              is_default: true,
              is_default_monitoring: true,
            },
            {
              id: 'internal-output',
              name: 'Internal',
              type: 'elasticsearch',
              is_default: false,
              is_default_monitoring: false,
              is_internal: true,
            },
          ],
        },
      };
    }

    return defaultHttpClientGetImplementation(path);
  });
};

const mockApiCallsWithInternalFleetServerHost = (http: MockedFleetStartServices['http']) => {
  http.get.mockImplementation(async (path) => {
    if (typeof path !== 'string') {
      throw new Error('Invalid request');
    }
    if (path === '/api/fleet/fleet_server_hosts') {
      return {
        data: {
          items: [
            {
              id: 'default-host',
              name: 'Default',
              is_default: true,
            },
            {
              id: 'internal-output',
              name: 'Internal',
              is_default: false,
              is_internal: true,
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
    const { result, waitForNextUpdate } = testRenderer.renderHook(() =>
      useOutputOptions({} as AgentPolicy)
    );
    expect(result.current.isLoading).toBeTruthy();

    await waitForNextUpdate();
    expect(result.current.dataOutputOptions).toMatchInlineSnapshot(`
      Array [
        Object {
          "disabled": undefined,
          "inputDisplay": "Default (currently Output 1)",
          "value": "@@##DEFAULT_SELECT##@@",
        },
        Object {
          "disabled": true,
          "inputDisplay": <React.Fragment>
            <EuiText
              size="s"
            >
              Output 1
            </EuiText>
            <EuiSpacer
              size="xs"
            />
            <EuiText
              size="s"
            >
              <FormattedMessage
                defaultMessage="{outputType} output for agent integration is not supported for Fleet Server, Synthetics or APM."
                id="xpack.fleet.agentPolicyForm.outputOptionDisabledTypeNotSupportedText"
                values={
                  Object {
                    "outputType": undefined,
                  }
                }
              />
            </EuiText>
          </React.Fragment>,
          "value": "output1",
        },
        Object {
          "disabled": true,
          "inputDisplay": <React.Fragment>
            <EuiText
              size="s"
            >
              Output 2
            </EuiText>
            <EuiSpacer
              size="xs"
            />
            <EuiText
              size="s"
            >
              <FormattedMessage
                defaultMessage="{outputType} output for agent integration is not supported for Fleet Server, Synthetics or APM."
                id="xpack.fleet.agentPolicyForm.outputOptionDisabledTypeNotSupportedText"
                values={
                  Object {
                    "outputType": undefined,
                  }
                }
              />
            </EuiText>
          </React.Fragment>,
          "value": "output2",
        },
        Object {
          "disabled": true,
          "inputDisplay": <React.Fragment>
            <EuiText
              size="s"
            >
              Output 3
            </EuiText>
            <EuiSpacer
              size="xs"
            />
            <EuiText
              size="s"
            >
              <FormattedMessage
                defaultMessage="{outputType} output for agent integration is not supported for Fleet Server, Synthetics or APM."
                id="xpack.fleet.agentPolicyForm.outputOptionDisabledTypeNotSupportedText"
                values={
                  Object {
                    "outputType": undefined,
                  }
                }
              />
            </EuiText>
          </React.Fragment>,
          "value": "output3",
        },
      ]
    `);
    expect(result.current.monitoringOutputOptions).toMatchInlineSnapshot(`
      Array [
        Object {
          "disabled": undefined,
          "inputDisplay": "Default (currently Output 1)",
          "value": "@@##DEFAULT_SELECT##@@",
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
    const { result, waitForNextUpdate } = testRenderer.renderHook(() =>
      useOutputOptions({} as AgentPolicy)
    );
    expect(result.current.isLoading).toBeTruthy();

    await waitForNextUpdate();
    expect(result.current.dataOutputOptions).toMatchInlineSnapshot(`
      Array [
        Object {
          "disabled": undefined,
          "inputDisplay": "Default (currently Output 1)",
          "value": "@@##DEFAULT_SELECT##@@",
        },
        Object {
          "disabled": true,
          "inputDisplay": <React.Fragment>
            <EuiText
              size="s"
            >
              Output 1
            </EuiText>
            <EuiSpacer
              size="xs"
            />
            <EuiText
              size="s"
            >
              <FormattedMessage
                defaultMessage="{outputType} output for agent integration is not supported for Fleet Server, Synthetics or APM."
                id="xpack.fleet.agentPolicyForm.outputOptionDisabledTypeNotSupportedText"
                values={
                  Object {
                    "outputType": undefined,
                  }
                }
              />
            </EuiText>
          </React.Fragment>,
          "value": "output1",
        },
        Object {
          "disabled": true,
          "inputDisplay": <React.Fragment>
            <EuiText
              size="s"
            >
              Output 2
            </EuiText>
            <EuiSpacer
              size="xs"
            />
            <EuiText
              size="s"
            >
              <FormattedMessage
                defaultMessage="{outputType} output for agent integration is not supported for Fleet Server, Synthetics or APM."
                id="xpack.fleet.agentPolicyForm.outputOptionDisabledTypeNotSupportedText"
                values={
                  Object {
                    "outputType": undefined,
                  }
                }
              />
            </EuiText>
          </React.Fragment>,
          "value": "output2",
        },
        Object {
          "disabled": true,
          "inputDisplay": <React.Fragment>
            <EuiText
              size="s"
            >
              Output 3
            </EuiText>
            <EuiSpacer
              size="xs"
            />
            <EuiText
              size="s"
            >
              <FormattedMessage
                defaultMessage="{outputType} output for agent integration is not supported for Fleet Server, Synthetics or APM."
                id="xpack.fleet.agentPolicyForm.outputOptionDisabledTypeNotSupportedText"
                values={
                  Object {
                    "outputType": undefined,
                  }
                }
              />
            </EuiText>
          </React.Fragment>,
          "value": "output3",
        },
      ]
    `);
    expect(result.current.monitoringOutputOptions).toMatchInlineSnapshot(`
      Array [
        Object {
          "disabled": undefined,
          "inputDisplay": "Default (currently Output 1)",
          "value": "@@##DEFAULT_SELECT##@@",
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

  it('should enable logstash output if there is no APM integration in the policy', async () => {
    const testRenderer = createFleetTestRendererMock();
    mockedUseLicence.mockReturnValue({
      hasAtLeast: () => true,
    } as unknown as LicenseService);
    mockApiCallsWithLogstashOutputs(testRenderer.startServices.http);
    const { result, waitForNextUpdate } = testRenderer.renderHook(() =>
      useOutputOptions({} as AgentPolicy)
    );
    expect(result.current.isLoading).toBeTruthy();

    await waitForNextUpdate();
    expect(result.current.dataOutputOptions).toMatchInlineSnapshot(`
      Array [
        Object {
          "disabled": false,
          "inputDisplay": "Default (currently Logstash 1)",
          "value": "@@##DEFAULT_SELECT##@@",
        },
        Object {
          "disabled": false,
          "inputDisplay": "Elasticsearch1",
          "value": "elasticsearch1",
        },
        Object {
          "disabled": false,
          "inputDisplay": "Logstash 1",
          "value": "logstash1",
        },
      ]
    `);
    expect(result.current.monitoringOutputOptions).toMatchInlineSnapshot(`
      Array [
        Object {
          "disabled": undefined,
          "inputDisplay": "Default (currently Logstash 1)",
          "value": "@@##DEFAULT_SELECT##@@",
        },
        Object {
          "disabled": false,
          "inputDisplay": "Elasticsearch1",
          "value": "elasticsearch1",
        },
        Object {
          "disabled": false,
          "inputDisplay": "Logstash 1",
          "value": "logstash1",
        },
      ]
    `);
  });

  it('should not enable logstash output if there is an APM integration in the policy', async () => {
    const testRenderer = createFleetTestRendererMock();
    mockedUseLicence.mockReturnValue({
      hasAtLeast: () => true,
    } as unknown as LicenseService);
    mockApiCallsWithLogstashOutputs(testRenderer.startServices.http);
    const { result, waitForNextUpdate } = testRenderer.renderHook(() =>
      useOutputOptions({
        package_policies: [
          {
            package: {
              name: 'apm',
            },
          },
        ],
      } as AgentPolicy)
    );
    expect(result.current.isLoading).toBeTruthy();

    await waitForNextUpdate();
    expect(result.current.dataOutputOptions).toMatchInlineSnapshot(`
      Array [
        Object {
          "disabled": true,
          "inputDisplay": <React.Fragment>
            <EuiText
              size="s"
            >
              Default (currently Logstash 1)
            </EuiText>
            <EuiSpacer
              size="xs"
            />
            <EuiText
              size="s"
            >
              <FormattedMessage
                defaultMessage="{outputType} output for agent integration is not supported for Fleet Server, Synthetics or APM."
                id="xpack.fleet.agentPolicyForm.outputOptionDisableOutputTypeText"
                values={
                  Object {
                    "outputType": "logstash",
                  }
                }
              />
            </EuiText>
          </React.Fragment>,
          "value": "@@##DEFAULT_SELECT##@@",
        },
        Object {
          "disabled": false,
          "inputDisplay": "Elasticsearch1",
          "value": "elasticsearch1",
        },
        Object {
          "disabled": true,
          "inputDisplay": <React.Fragment>
            <EuiText
              size="s"
            >
              Logstash 1
            </EuiText>
            <EuiSpacer
              size="xs"
            />
            <EuiText
              size="s"
            >
              <FormattedMessage
                defaultMessage="{outputType} output for agent integration is not supported for Fleet Server, Synthetics or APM."
                id="xpack.fleet.agentPolicyForm.outputOptionDisabledTypeNotSupportedText"
                values={
                  Object {
                    "outputType": "logstash",
                  }
                }
              />
            </EuiText>
          </React.Fragment>,
          "value": "logstash1",
        },
      ]
    `);
    expect(result.current.monitoringOutputOptions).toMatchInlineSnapshot(`
      Array [
        Object {
          "disabled": undefined,
          "inputDisplay": "Default (currently Logstash 1)",
          "value": "@@##DEFAULT_SELECT##@@",
        },
        Object {
          "disabled": false,
          "inputDisplay": "Elasticsearch1",
          "value": "elasticsearch1",
        },
        Object {
          "disabled": false,
          "inputDisplay": "Logstash 1",
          "value": "logstash1",
        },
      ]
    `);
  });

  it('should enable remote es output for data and monitoring output', async () => {
    const testRenderer = createFleetTestRendererMock();
    mockedUseLicence.mockReturnValue({
      hasAtLeast: () => true,
    } as unknown as LicenseService);
    mockApiCallsWithRemoteESOutputs(testRenderer.startServices.http);
    const { result, waitForNextUpdate } = testRenderer.renderHook(() =>
      useOutputOptions({} as AgentPolicy)
    );
    expect(result.current.isLoading).toBeTruthy();

    await waitForNextUpdate();
    expect(result.current.dataOutputOptions.length).toEqual(2);
    expect(result.current.dataOutputOptions[1].value).toEqual('remote1');
    expect(result.current.monitoringOutputOptions.length).toEqual(2);
    expect(result.current.monitoringOutputOptions[1].value).toEqual('remote1');
  });

  it('should not enable internal outputs', async () => {
    const testRenderer = createFleetTestRendererMock();
    mockedUseLicence.mockReturnValue({
      hasAtLeast: () => true,
    } as unknown as LicenseService);
    mockApiCallsWithInternalOutputs(testRenderer.startServices.http);
    const { result, waitForNextUpdate } = testRenderer.renderHook(() =>
      useOutputOptions({} as AgentPolicy)
    );
    expect(result.current.isLoading).toBeTruthy();

    await waitForNextUpdate();
    expect(result.current.dataOutputOptions).toMatchInlineSnapshot(`
      Array [
        Object {
          "disabled": false,
          "inputDisplay": "Default (currently Default)",
          "value": "@@##DEFAULT_SELECT##@@",
        },
        Object {
          "disabled": false,
          "inputDisplay": "Default",
          "value": "default-output",
        },
        Object {
          "disabled": true,
          "inputDisplay": "Internal",
          "value": "internal-output",
        },
      ]
    `);
    expect(result.current.monitoringOutputOptions).toMatchInlineSnapshot(`
      Array [
        Object {
          "disabled": undefined,
          "inputDisplay": "Default (currently Default)",
          "value": "@@##DEFAULT_SELECT##@@",
        },
        Object {
          "disabled": false,
          "inputDisplay": "Default",
          "value": "default-output",
        },
        Object {
          "disabled": true,
          "inputDisplay": "Internal",
          "value": "internal-output",
        },
      ]
    `);
  });
});

describe('useFleetServerHostsOptions', () => {
  it('should not enable internal fleet server hosts', async () => {
    const testRenderer = createFleetTestRendererMock();
    mockApiCallsWithInternalFleetServerHost(testRenderer.startServices.http);
    const { result, waitForNextUpdate } = testRenderer.renderHook(() =>
      useFleetServerHostsOptions({} as AgentPolicy)
    );
    expect(result.current.isLoading).toBeTruthy();

    await waitForNextUpdate();
    expect(result.current.fleetServerHostsOptions).toMatchInlineSnapshot(`
      Array [
        Object {
          "disabled": undefined,
          "inputDisplay": "Default (currently Default)",
          "value": "@@##DEFAULT_SELECT##@@",
        },
        Object {
          "disabled": true,
          "inputDisplay": "Internal",
          "value": "internal-output",
        },
      ]
    `);
  });
});
