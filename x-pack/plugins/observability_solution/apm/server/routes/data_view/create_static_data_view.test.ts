/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { APMIndices } from '@kbn/apm-data-access-plugin/server';
import { Logger } from '@kbn/core/server';
import { DataViewsService } from '@kbn/data-views-plugin/common';
import { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';
import { APMRouteHandlerResources } from '../apm_routes/register_apm_server_routes';
import * as HistoricalAgentData from '../historical_data/has_historical_agent_data';
import { APMCore } from '../typings';
import { createOrUpdateStaticDataView } from './create_static_data_view';

function getMockedDataViewService(existingDataViewTitle: string) {
  return {
    get: jest.fn(() => ({
      getIndexPattern: () => existingDataViewTitle,
    })),
    createAndSave: jest.fn(),
    delete: () => {},
  } as unknown as DataViewsService;
}

const coreMock = {
  start: () => {
    return {
      savedObjects: {
        getScopedClient: () => {
          return {
            updateObjectsSpaces: () => {},
          };
        },
      },
    };
  },
} as unknown as APMCore;

const logger = {
  info: jest.fn,
} as unknown as Logger;

const apmEventClientMock = {
  search: jest.fn(),
  indices: {
    transaction: 'apm-*-transaction-*',
    span: 'apm-*-span-*',
    error: 'apm-*-error-*',
    metric: 'apm-*-metrics-*',
  } as APMIndices,
} as unknown as APMEventClient;

describe('createStaticDataView', () => {
  it(`should not create data view if 'xpack.apm.autocreateApmIndexPattern=false'`, async () => {
    const dataViewService = getMockedDataViewService('apm-*');
    await createOrUpdateStaticDataView({
      apmEventClient: apmEventClientMock,
      resources: {
        config: { autoCreateApmDataView: false },
      } as APMRouteHandlerResources,
      dataViewService,
      spaceId: 'default',
      logger,
    });
    expect(dataViewService.createAndSave).not.toHaveBeenCalled();
  });

  it(`should not create data view if no APM data is found`, async () => {
    // does not have APM data
    jest
      .spyOn(HistoricalAgentData, 'hasHistoricalAgentData')
      .mockResolvedValue(false);

    const dataViewService = getMockedDataViewService('apm-*');

    await createOrUpdateStaticDataView({
      apmEventClient: apmEventClientMock,
      resources: {
        config: { autoCreateApmDataView: false },
      } as APMRouteHandlerResources,
      dataViewService,
      spaceId: 'default',
      logger,
    });
    expect(dataViewService.createAndSave).not.toHaveBeenCalled();
  });

  it(`should create data view`, async () => {
    // does have APM data
    jest
      .spyOn(HistoricalAgentData, 'hasHistoricalAgentData')
      .mockResolvedValue(true);

    const dataViewService = getMockedDataViewService('apm-*');

    await createOrUpdateStaticDataView({
      apmEventClient: apmEventClientMock,
      resources: {
        core: coreMock,
        config: { autoCreateApmDataView: true },
      } as APMRouteHandlerResources,
      dataViewService,
      spaceId: 'default',
      logger,
    });

    expect(dataViewService.createAndSave).toHaveBeenCalled();
  });

  it(`should overwrite the data view if the new data view title does not match the old data view title`, async () => {
    // does have APM data
    jest
      .spyOn(HistoricalAgentData, 'hasHistoricalAgentData')
      .mockResolvedValue(true);

    const dataViewService = getMockedDataViewService('apm-*');
    const expectedDataViewTitle =
      'apm-*-transaction-*,apm-*-span-*,apm-*-error-*,apm-*-metrics-*';

    await createOrUpdateStaticDataView({
      apmEventClient: apmEventClientMock,
      resources: {
        core: coreMock,
        config: { autoCreateApmDataView: true },
      } as APMRouteHandlerResources,
      dataViewService,
      spaceId: 'default',
      logger,
    });

    expect(dataViewService.get).toHaveBeenCalled();
    expect(dataViewService.createAndSave).toHaveBeenCalled();
    // @ts-ignore
    expect(dataViewService.createAndSave.mock.calls[0][0].title).toBe(
      expectedDataViewTitle
    );
    // @ts-ignore
    expect(dataViewService.createAndSave.mock.calls[0][1]).toBe(true);
  });

  it(`should not overwrite an data view if the new data view title matches the old data view title`, async () => {
    // does have APM data
    jest
      .spyOn(HistoricalAgentData, 'hasHistoricalAgentData')
      .mockResolvedValue(true);

    const dataViewService = getMockedDataViewService(
      'apm-*-transaction-*,apm-*-span-*,apm-*-error-*,apm-*-metrics-*'
    );

    await createOrUpdateStaticDataView({
      apmEventClient: apmEventClientMock,
      resources: {
        core: coreMock,
        config: { autoCreateApmDataView: true },
      } as APMRouteHandlerResources,
      dataViewService,
      spaceId: 'default',
      logger,
    });

    expect(dataViewService.get).toHaveBeenCalled();
    expect(dataViewService.createAndSave).not.toHaveBeenCalled();
  });
});
