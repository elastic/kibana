/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import { fieldFormatsServiceMock } from '@kbn/field-formats-plugin/public/mocks';
import { BehaviorSubject } from 'rxjs';
import { mlApiServicesMock } from '../../../services/__mocks__/ml_api_services';
import { notificationServiceMock } from '@kbn/core-notifications-browser-mocks';
import { LIGHT_THEME } from '@elastic/charts';

export const chartsServiceMock = {
  theme: {
    useChartsBaseTheme: jest.fn(() => LIGHT_THEME),
  },
  activeCursor: {
    activeCursor$: new BehaviorSubject({
      cursor: {
        x: 10432423,
      },
    }),
  },
};

export const kibanaContextMock = {
  services: {
    uiSettings: { get: jest.fn() },
    chrome: { recentlyAccessed: { add: jest.fn() } },
    application: {
      navigateToApp: jest.fn(),
      navigateToUrl: jest.fn(),
      capabilities: {
        ml: {
          canCreateJob: true,
        },
      },
    },
    http: {
      basePath: {
        get: jest.fn(),
      },
    },
    share: {
      url: {
        locators: {
          get: jest.fn(() => {
            return {
              getUrl: jest.fn(() => {
                return Promise.resolve('mock-url');
              }),
            };
          }),
        },
      },
      urlGenerators: { getUrlGenerator: jest.fn() },
    },
    data: dataPluginMock.createStartContract(),
    charts: chartsServiceMock,
    fieldFormats: fieldFormatsServiceMock.createStartContract(),
    mlServices: {
      mlApiServices: mlApiServicesMock,
      mlCapabilities: {
        refreshCapabilities: jest.fn(),
      },
      mlFieldFormatService: {
        getFieldFormat: jest.fn(),
      },
    },
    notifications: notificationServiceMock.createStartContract(),
  },
};

export const useMlKibana = jest.fn(() => {
  return kibanaContextMock;
});
