/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createStaticDataView } from './create_static_data_view';
import * as HistoricalAgentData from '../historical_data/has_historical_agent_data';
import { DataViewsService } from '@kbn/data-views-plugin/common';
import { APMRouteHandlerResources, APMCore } from '../typings';
import { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';
import { APMConfig } from '../..';

function getMockedDataViewService(existingDataViewTitle: string) {
  return {
    get: jest.fn(() => ({
      title: existingDataViewTitle,
    })),
    createAndSave: jest.fn(),
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

const apmEventClientMock = {
  search: jest.fn(),
  indices: {
    transaction: 'apm-*-transaction-*',
    span: 'apm-*-span-*',
    error: 'apm-*-error-*',
    metric: 'apm-*-metrics-*',
  } as APMConfig['indices'],
} as unknown as APMEventClient;

describe('createStaticDataView', () => {
  it(`should not create data view if 'xpack.apm.autocreateApmIndexPattern=false'`, async () => {
    const dataViewService = getMockedDataViewService('apm-*');
    await createStaticDataView({
      apmEventClient: apmEventClientMock,
      resources: {
        config: { autoCreateApmDataView: false },
      } as APMRouteHandlerResources,
      dataViewService,
    });
    expect(dataViewService.createAndSave).not.toHaveBeenCalled();
  });

  it(`should not create data view if no APM data is found`, async () => {
    // does not have APM data
    jest
      .spyOn(HistoricalAgentData, 'hasHistoricalAgentData')
      .mockResolvedValue(false);

    const dataViewService = getMockedDataViewService('apm-*');

    await createStaticDataView({
      apmEventClient: apmEventClientMock,
      resources: {
        config: { autoCreateApmDataView: false },
      } as APMRouteHandlerResources,
      dataViewService,
    });
    expect(dataViewService.createAndSave).not.toHaveBeenCalled();
  });

  it(`should create data view`, async () => {
    // does have APM data
    jest
      .spyOn(HistoricalAgentData, 'hasHistoricalAgentData')
      .mockResolvedValue(true);

    const dataViewService = getMockedDataViewService('apm-*');

    await createStaticDataView({
      apmEventClient: apmEventClientMock,
      resources: {
        core: coreMock,
        config: { autoCreateApmDataView: true },
      } as APMRouteHandlerResources,
      dataViewService,
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

    await createStaticDataView({
      apmEventClient: apmEventClientMock,
      resources: {
        core: coreMock,
        config: { autoCreateApmDataView: true },
      } as APMRouteHandlerResources,
      dataViewService,
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

    await createStaticDataView({
      apmEventClient: apmEventClientMock,
      resources: {
        core: coreMock,
        config: { autoCreateApmDataView: true },
      } as APMRouteHandlerResources,
      dataViewService,
    });

    expect(dataViewService.get).toHaveBeenCalled();
    expect(dataViewService.createAndSave).not.toHaveBeenCalled();
  });
});
