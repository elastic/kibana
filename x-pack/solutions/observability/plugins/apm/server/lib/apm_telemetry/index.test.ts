/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { savedObjectsClientMock } from '@kbn/core-saved-objects-api-server-mocks';
import { coreMock } from '@kbn/core/server/mocks';
import { loggerMock } from '@kbn/logging-mocks';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import type { RunContext } from '@kbn/task-manager-plugin/server';
import { usageCollectionPluginMock } from '@kbn/usage-collection-plugin/server/mocks';
import { createApmTelemetry, APM_TELEMETRY_TASK_NAME, APM_TELEMETRY_TASK_TIMEOUT } from '.';
import { APM_TELEMETRY_SAVED_OBJECT_TYPE } from '../../../common/apm_saved_object_constants';
import { collectDataTelemetry } from './collect_data_telemetry';
import { getTelemetryClient } from './telemetry_client';
import { getInternalSavedObjectsClient } from '../helpers/get_internal_saved_objects_client';

jest.mock('./collect_data_telemetry');
jest.mock('./telemetry_client');
jest.mock('../helpers/get_internal_saved_objects_client');

const collectDataTelemetryMock = collectDataTelemetry as jest.MockedFunction<
  typeof collectDataTelemetry
>;
const getTelemetryClientMock = getTelemetryClient as jest.MockedFunction<typeof getTelemetryClient>;
const getInternalSavedObjectsClientMock = getInternalSavedObjectsClient as jest.MockedFunction<
  typeof getInternalSavedObjectsClient
>;

describe('createApmTelemetry', () => {
  async function setup() {
    const core = coreMock.createSetup();
    const taskManagerSetup = taskManagerMock.createSetup();
    const savedObjectsClient = savedObjectsClientMock.create();

    getInternalSavedObjectsClientMock.mockResolvedValue(savedObjectsClient as any);
    getTelemetryClientMock.mockResolvedValue({} as any);
    collectDataTelemetryMock.mockResolvedValue({});

    await createApmTelemetry({
      core,
      getApmIndices: jest.fn().mockResolvedValue({}),
      usageCollector: usageCollectionPluginMock.createSetupContract(),
      taskManager: taskManagerSetup,
      logger: loggerMock.create(),
      kibanaVersion: '9.4.0',
      isProd: false,
    });

    const definition =
      taskManagerSetup.registerTaskDefinitions.mock.calls[0][0][APM_TELEMETRY_TASK_NAME];

    return { core, definition, savedObjectsClient };
  }

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('registers the task with an explicit timeout', async () => {
    const { definition } = await setup();

    expect(definition.timeout).toBe(APM_TELEMETRY_TASK_TIMEOUT);
  });

  it('collects and stores telemetry when the run is not aborted', async () => {
    const { core, definition, savedObjectsClient } = await setup();

    const controller = new AbortController();
    const runner = definition.createTaskRunner({
      signal: controller.signal,
    } as unknown as RunContext);

    await runner.run();

    expect(getTelemetryClientMock).toHaveBeenCalledWith({ core, signal: controller.signal });
    expect(collectDataTelemetryMock).toHaveBeenCalledWith(
      expect.objectContaining({ signal: controller.signal })
    );
    expect(savedObjectsClient.create).toHaveBeenCalledWith(
      APM_TELEMETRY_SAVED_OBJECT_TYPE,
      expect.objectContaining({ kibanaVersion: '9.4.0' }),
      { id: APM_TELEMETRY_SAVED_OBJECT_TYPE, overwrite: true }
    );
  });

  it('skips the saved object write when the run is aborted mid-collection', async () => {
    const { definition, savedObjectsClient } = await setup();

    const controller = new AbortController();
    collectDataTelemetryMock.mockImplementation(async () => {
      controller.abort();
      return {};
    });

    const runner = definition.createTaskRunner({
      signal: controller.signal,
    } as unknown as RunContext);

    await runner.run();

    expect(collectDataTelemetryMock).toHaveBeenCalled();
    expect(savedObjectsClient.create).not.toHaveBeenCalled();
  });
});
