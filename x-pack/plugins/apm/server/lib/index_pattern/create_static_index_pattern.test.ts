/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createStaticIndexPattern } from './create_static_index_pattern';
import { Setup } from '../helpers/setup_request';
import * as HistoricalAgentData from '../services/get_services/has_historical_agent_data';
import { InternalSavedObjectsClient } from '../helpers/get_internal_saved_objects_client';
import { APMConfig } from '../..';

function getMockSavedObjectsClient() {
  return ({
    get: jest.fn(() => ({
      attributes: {
        title: 'apm-*',
      },
    })),
    create: jest.fn(),
  } as unknown) as InternalSavedObjectsClient;
}

describe('createStaticIndexPattern', () => {
  it(`should not create index pattern if 'xpack.apm.autocreateApmIndexPattern=false'`, async () => {
    const setup = {} as Setup;

    const savedObjectsClient = getMockSavedObjectsClient();
    await createStaticIndexPattern({
      setup,
      config: { 'xpack.apm.autocreateApmIndexPattern': false } as APMConfig,
      savedObjectsClient,
      spaceId: 'default',
    });
    expect(savedObjectsClient.create).not.toHaveBeenCalled();
  });

  it(`should not create index pattern if no APM data is found`, async () => {
    const setup = {} as Setup;

    // does not have APM data
    jest
      .spyOn(HistoricalAgentData, 'hasHistoricalAgentData')
      .mockResolvedValue(false);

    const savedObjectsClient = getMockSavedObjectsClient();

    await createStaticIndexPattern({
      setup,
      config: { 'xpack.apm.autocreateApmIndexPattern': true } as APMConfig,
      savedObjectsClient,
      spaceId: 'default',
    });
    expect(savedObjectsClient.create).not.toHaveBeenCalled();
  });

  it(`should create index pattern`, async () => {
    const setup = {} as Setup;

    // does have APM data
    jest
      .spyOn(HistoricalAgentData, 'hasHistoricalAgentData')
      .mockResolvedValue(true);

    const savedObjectsClient = getMockSavedObjectsClient();

    await createStaticIndexPattern({
      setup,
      config: { 'xpack.apm.autocreateApmIndexPattern': true } as APMConfig,
      savedObjectsClient,
      spaceId: 'default',
    });

    expect(savedObjectsClient.create).toHaveBeenCalled();
  });

  it(`should upgrade an index pattern if 'apm_oss.indexPattern' does not match title`, async () => {
    const setup = {} as Setup;

    // does have APM data
    jest
      .spyOn(HistoricalAgentData, 'hasHistoricalAgentData')
      .mockResolvedValue(true);

    const savedObjectsClient = getMockSavedObjectsClient();
    const apmIndexPatternTitle = 'traces-apm*,logs-apm*,metrics-apm*,apm-*';

    await createStaticIndexPattern({
      setup,
      config: {
        'xpack.apm.autocreateApmIndexPattern': true,
        // eslint-disable-next-line @typescript-eslint/naming-convention
        'apm_oss.indexPattern': apmIndexPatternTitle,
      } as APMConfig,
      savedObjectsClient,
      spaceId: 'default',
    });

    expect(savedObjectsClient.get).toHaveBeenCalled();
    expect(savedObjectsClient.create).toHaveBeenCalled();
    // @ts-ignore
    expect(savedObjectsClient.create.mock.calls[0][1].title).toBe(
      apmIndexPatternTitle
    );
    // @ts-ignore
    expect(savedObjectsClient.create.mock.calls[0][2].overwrite).toBe(true);
  });

  it(`should not upgrade an index pattern if 'apm_oss.indexPattern' already match existing title`, async () => {
    const setup = {} as Setup;

    // does have APM data
    jest
      .spyOn(HistoricalAgentData, 'hasHistoricalAgentData')
      .mockResolvedValue(true);

    const savedObjectsClient = getMockSavedObjectsClient();
    const apmIndexPatternTitle = 'apm-*';

    await createStaticIndexPattern({
      setup,
      config: {
        'xpack.apm.autocreateApmIndexPattern': true,
        // eslint-disable-next-line @typescript-eslint/naming-convention
        'apm_oss.indexPattern': apmIndexPatternTitle,
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
