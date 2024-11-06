/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act } from 'react-dom/test-utils';
import { createMemoryHistory } from 'history';
import { notificationServiceMock } from '@kbn/core/public/mocks';

import { breadcrumbService } from '../../../public/application/services/breadcrumbs';
import { MAX_DATA_RETENTION } from '../../../common/constants';
import * as fixtures from '../../../test/fixtures';
import { setupEnvironment } from '../helpers';
import { notificationService } from '../../../public/application/services/notification';

import {
  DataStreamsTabTestBed,
  setup,
  createDataStreamPayload,
  createDataStreamBackingIndex,
  createNonDataStreamIndex,
} from './data_streams_tab.helpers';

const urlServiceMock = {
  locators: {
    get: () => ({
      getLocation: async () => ({
        app: '',
        path: '',
        state: {},
      }),
      getUrl: async ({ policyName }: { policyName: string }) => `/test/${policyName}`,
      navigate: async () => {},
      useUrl: () => '',
    }),
  },
};

describe('Data Streams - Project level max retention', () => {
  const { httpSetup, httpRequestsMockHelpers } = setupEnvironment();
  let testBed: DataStreamsTabTestBed;
  jest.spyOn(breadcrumbService, 'setBreadcrumbs');

  const notificationsServiceMock = notificationServiceMock.createStartContract();

  beforeEach(async () => {
    const {
      setLoadIndicesResponse,
      setLoadDataStreamsResponse,
      setLoadDataStreamResponse,
      setLoadTemplateResponse,
      setLoadTemplatesResponse,
    } = httpRequestsMockHelpers;

    setLoadIndicesResponse([
      createDataStreamBackingIndex('data-stream-index', 'dataStream1'),
      createNonDataStreamIndex('non-data-stream-index'),
    ]);

    const dataStreamForDetailPanel = createDataStreamPayload({
      name: 'dataStream1',
      storageSize: '5b',
      storageSizeBytes: 5,
      // metering API mock
      meteringStorageSize: '156kb',
      meteringStorageSizeBytes: 156000,
      meteringDocsCount: 10000,
    });

    setLoadDataStreamsResponse([
      dataStreamForDetailPanel,
      createDataStreamPayload({
        name: 'dataStream2',
        storageSize: '1kb',
        storageSizeBytes: 1000,
        // metering API mock
        meteringStorageSize: '156kb',
        meteringStorageSizeBytes: 156000,
        meteringDocsCount: 10000,
        lifecycle: {
          enabled: true,
          data_retention: '7d',
          effective_retention: '5d',
          globalMaxRetention: '20d',
          retention_determined_by: MAX_DATA_RETENTION,
        },
      }),
    ]);

    setLoadDataStreamResponse(dataStreamForDetailPanel.name, dataStreamForDetailPanel);

    const indexTemplate = fixtures.getTemplate({ name: 'indexTemplate' });
    setLoadTemplatesResponse({ templates: [indexTemplate], legacyTemplates: [] });
    setLoadTemplateResponse(indexTemplate.name, indexTemplate);

    notificationService.setup(notificationsServiceMock);
    testBed = await setup(httpSetup, {
      history: createMemoryHistory(),
      services: {
        notificationService,
      },
      config: {
        enableProjectLevelRetentionChecks: true,
      },
    });
    await act(async () => {
      testBed.actions.goToDataStreamsList();
    });
    testBed.component.update();
  });

  it('Should show error when retention value is bigger than project level retention', async () => {
    const { setLoadDataStreamsResponse, setLoadDataStreamResponse } = httpRequestsMockHelpers;

    const ds1 = createDataStreamPayload({
      name: 'dataStream1',
      lifecycle: {
        enabled: true,
        data_retention: '25d',
        effective_retention: '25d',
        retention_determined_by: MAX_DATA_RETENTION,
        globalMaxRetention: '20d',
      },
    });

    setLoadDataStreamsResponse([ds1]);
    setLoadDataStreamResponse(ds1.name, ds1);

    testBed = await setup(httpSetup, {
      history: createMemoryHistory(),
      url: urlServiceMock,
      config: {
        enableProjectLevelRetentionChecks: true,
      },
    });
    await act(async () => {
      testBed.actions.goToDataStreamsList();
    });
    testBed.component.update();

    const { actions } = testBed;

    await actions.clickNameAt(0);
    actions.clickEditDataRetentionButton();

    expect(testBed.form.getErrorsMessages().length).toBeGreaterThan(0);
  });
});
