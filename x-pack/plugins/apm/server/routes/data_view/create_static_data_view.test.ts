/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createStaticDataView } from './create_static_data_view';
import { Setup } from '../../lib/helpers/setup_request';
import * as HistoricalAgentData from '../historical_data/has_historical_agent_data';
import { InternalSavedObjectsClient } from '../../lib/helpers/get_internal_saved_objects_client';
import { APMConfig } from '../..';

function getMockSavedObjectsClient(existingDataViewTitle: string) {
  return {
    get: jest.fn(() => ({
      attributes: {
        title: existingDataViewTitle,
      },
    })),
    create: jest.fn(),
  } as unknown as InternalSavedObjectsClient;
}

const setup = {
  indices: {
    transaction: 'apm-*-transaction-*',
    span: 'apm-*-span-*',
    error: 'apm-*-error-*',
    metric: 'apm-*-metrics-*',
  } as APMConfig['indices'],
} as unknown as Setup;

describe('createStaticDataView', () => {
  it(`should not create data view if 'xpack.apm.autocreateApmIndexPattern=false'`, async () => {
    const savedObjectsClient = getMockSavedObjectsClient('apm-*');
    await createStaticDataView({
      setup,
      config: { autoCreateApmDataView: false } as APMConfig,
      savedObjectsClient,
      spaceId: 'default',
    });
    expect(savedObjectsClient.create).not.toHaveBeenCalled();
  });

  it(`should not create data view if no APM data is found`, async () => {
    // does not have APM data
    jest
      .spyOn(HistoricalAgentData, 'hasHistoricalAgentData')
      .mockResolvedValue(false);

    const savedObjectsClient = getMockSavedObjectsClient('apm-*');

    await createStaticDataView({
      setup,
      config: { autoCreateApmDataView: true } as APMConfig,
      savedObjectsClient,
      spaceId: 'default',
    });
    expect(savedObjectsClient.create).not.toHaveBeenCalled();
  });

  it(`should create data view`, async () => {
    // does have APM data
    jest
      .spyOn(HistoricalAgentData, 'hasHistoricalAgentData')
      .mockResolvedValue(true);

    const savedObjectsClient = getMockSavedObjectsClient('apm-*');

    await createStaticDataView({
      setup,
      config: { autoCreateApmDataView: true } as APMConfig,
      savedObjectsClient,
      spaceId: 'default',
    });

    expect(savedObjectsClient.create).toHaveBeenCalled();
  });

  it(`should overwrite the data view if the new data view title does not match the old data view title`, async () => {
    // does have APM data
    jest
      .spyOn(HistoricalAgentData, 'hasHistoricalAgentData')
      .mockResolvedValue(true);

    const savedObjectsClient = getMockSavedObjectsClient('apm-*');
    const expectedDataViewTitle =
      'apm-*-transaction-*,apm-*-span-*,apm-*-error-*,apm-*-metrics-*';

    await createStaticDataView({
      setup,
      config: { autoCreateApmDataView: true } as APMConfig,
      savedObjectsClient,
      spaceId: 'default',
    });

    expect(savedObjectsClient.get).toHaveBeenCalled();
    expect(savedObjectsClient.create).toHaveBeenCalled();
    // @ts-ignore
    expect(savedObjectsClient.create.mock.calls[0][1].title).toBe(
      expectedDataViewTitle
    );
    // @ts-ignore
    expect(savedObjectsClient.create.mock.calls[0][2].overwrite).toBe(true);
  });

  it(`should not overwrite an data view if the new data view title matches the old data view title`, async () => {
    // does have APM data
    jest
      .spyOn(HistoricalAgentData, 'hasHistoricalAgentData')
      .mockResolvedValue(true);

    const savedObjectsClient = getMockSavedObjectsClient(
      'apm-*-transaction-*,apm-*-span-*,apm-*-error-*,apm-*-metrics-*'
    );

    await createStaticDataView({
      setup,
      config: { autoCreateApmDataView: true } as APMConfig,
      savedObjectsClient,
      spaceId: 'default',
    });

    expect(savedObjectsClient.get).toHaveBeenCalled();
    expect(savedObjectsClient.create).toHaveBeenCalled();
    // @ts-ignore
    expect(savedObjectsClient.create.mock.calls[0][2].overwrite).toBe(false);
  });
});
