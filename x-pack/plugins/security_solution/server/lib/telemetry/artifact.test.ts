/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createMockTelemetryReceiver } from './__mocks__';
import { Artifact } from './artifact';
import axios from 'axios';
import type { TelemetryConfiguration } from './types';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('telemetry artifact test', () => {
  test('start should retrieve cluster information', async () => {
    const mockTelemetryReceiver = createMockTelemetryReceiver();
    const artifact = new Artifact();
    await artifact.start(mockTelemetryReceiver);
    expect(mockTelemetryReceiver.fetchClusterInfo).toHaveBeenCalled();
  });

  test('getArtifact should throw an error if manifest url is null', async () => {
    const artifact = new Artifact();
    await expect(async () => artifact.getArtifact('test')).rejects.toThrow('No manifest url');
  });

  test('getArtifact should throw an error if relative url is null', async () => {
    const mockTelemetryReceiver = createMockTelemetryReceiver();
    const artifact = new Artifact();
    await artifact.start(mockTelemetryReceiver);
    const axiosResponse = {
      data: 'x-pack/plugins/security_solution/server/lib/telemetry/__mocks__/kibana-artifacts.zip',
    };
    mockedAxios.get.mockImplementationOnce(() => Promise.resolve(axiosResponse));
    await expect(async () => artifact.getArtifact('artifactThatDoesNotExist')).rejects.toThrow(
      'No artifact for name artifactThatDoesNotExist'
    );
  });

  test('getArtifact should return respective artifact', async () => {
    const mockTelemetryReceiver = createMockTelemetryReceiver();
    const artifact = new Artifact();
    await artifact.start(mockTelemetryReceiver);
    const axiosResponse = {
      data: 'x-pack/plugins/security_solution/server/lib/telemetry/__mocks__/kibana-artifacts.zip',
    };
    mockedAxios.get
      .mockImplementationOnce(() => Promise.resolve(axiosResponse))
      .mockImplementationOnce(() =>
        Promise.resolve({
          data: {
            telemetry_max_buffer_size: 100,
            max_security_list_telemetry_batch: 100,
            max_endpoint_telemetry_batch: 300,
            max_detection_rule_telemetry_batch: 1_000,
            max_detection_alerts_batch: 50,
          },
        })
      );
    const artifactObject: TelemetryConfiguration = (await artifact.getArtifact(
      'telemetry-buffer-and-batch-sizes-v1'
    )) as unknown as TelemetryConfiguration;
    expect(artifactObject.telemetry_max_buffer_size).toEqual(100);
    expect(artifactObject.max_security_list_telemetry_batch).toEqual(100);
    expect(artifactObject.max_endpoint_telemetry_batch).toEqual(300);
    expect(artifactObject.max_detection_rule_telemetry_batch).toEqual(1_000);
    expect(artifactObject.max_detection_alerts_batch).toEqual(50);
  });
});
