/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @typescript-eslint/naming-convention */
import { createStaticIndexPattern } from './create_static_index_pattern';
import { Setup } from '../helpers/setup_request';
import * as HistoricalAgentData from '../../routes/historical_data/has_historical_agent_data';
import { InternalSavedObjectsClient } from '../helpers/get_internal_saved_objects_client';
import { APMConfig } from '../..';

function getMockSavedObjectsClient(existingIndexPatternTitle: string) {
  return {
    get: jest.fn(() => ({
      attributes: {
        title: existingIndexPatternTitle,
      },
    })),
    create: jest.fn(),
  } as unknown as InternalSavedObjectsClient;
}

const setup = {
  indices: {
    'apm_oss.transactionIndices': 'apm-*-transaction-*',
    'apm_oss.spanIndices': 'apm-*-span-*',
    'apm_oss.errorIndices': 'apm-*-error-*',
    'apm_oss.metricsIndices': 'apm-*-metrics-*',
  },
} as unknown as Setup;

describe('createStaticIndexPattern', () => {
  it(`should not create index pattern if 'xpack.apm.autocreateApmIndexPattern=false'`, async () => {
    const savedObjectsClient = getMockSavedObjectsClient('apm-*');
    await createStaticIndexPattern({
      setup,
      config: { 'xpack.apm.autocreateApmIndexPattern': false } as APMConfig,
      savedObjectsClient,
      spaceId: 'default',
    });
    expect(savedObjectsClient.create).not.toHaveBeenCalled();
  });

  it(`should not create index pattern if no APM data is found`, async () => {
    // does not have APM data
    jest
      .spyOn(HistoricalAgentData, 'hasHistoricalAgentData')
      .mockResolvedValue(false);

    const savedObjectsClient = getMockSavedObjectsClient('apm-*');

    await createStaticIndexPattern({
      setup,
      config: { 'xpack.apm.autocreateApmIndexPattern': true } as APMConfig,
      savedObjectsClient,
      spaceId: 'default',
    });
    expect(savedObjectsClient.create).not.toHaveBeenCalled();
  });

  it(`should create index pattern`, async () => {
    // does have APM data
    jest
      .spyOn(HistoricalAgentData, 'hasHistoricalAgentData')
      .mockResolvedValue(true);

    const savedObjectsClient = getMockSavedObjectsClient('apm-*');

    await createStaticIndexPattern({
      setup,
      config: { 'xpack.apm.autocreateApmIndexPattern': true } as APMConfig,
      savedObjectsClient,
      spaceId: 'default',
    });

    expect(savedObjectsClient.create).toHaveBeenCalled();
  });

  it(`should overwrite the index pattern if the new index pattern title does not match the old index pattern title`, async () => {
    // does have APM data
    jest
      .spyOn(HistoricalAgentData, 'hasHistoricalAgentData')
      .mockResolvedValue(true);

    const savedObjectsClient = getMockSavedObjectsClient('apm-*');
    const expectedIndexPatternTitle =
      'apm-*-transaction-*,apm-*-span-*,apm-*-error-*,apm-*-metrics-*';

    await createStaticIndexPattern({
      setup,
      config: {
        'xpack.apm.autocreateApmIndexPattern': true,
      } as APMConfig,
      savedObjectsClient,
      spaceId: 'default',
    });

    expect(savedObjectsClient.get).toHaveBeenCalled();
    expect(savedObjectsClient.create).toHaveBeenCalled();
    // @ts-ignore
    expect(savedObjectsClient.create.mock.calls[0][1].title).toBe(
      expectedIndexPatternTitle
    );
    // @ts-ignore
    expect(savedObjectsClient.create.mock.calls[0][2].overwrite).toBe(true);
  });

  it(`should not overwrite an index pattern if the new index pattern title matches the old index pattern title`, async () => {
    // does have APM data
    jest
      .spyOn(HistoricalAgentData, 'hasHistoricalAgentData')
      .mockResolvedValue(true);

    const savedObjectsClient = getMockSavedObjectsClient(
      'apm-*-transaction-*,apm-*-span-*,apm-*-error-*,apm-*-metrics-*'
    );

    await createStaticIndexPattern({
      setup,
      config: {
        'xpack.apm.autocreateApmIndexPattern': true,
      } as APMConfig,
      savedObjectsClient,
      spaceId: 'default',
    });

    expect(savedObjectsClient.get).toHaveBeenCalled();
    expect(savedObjectsClient.create).toHaveBeenCalled();
    // @ts-ignore
    expect(savedObjectsClient.create.mock.calls[0][2].overwrite).toBe(false);
  });
});
