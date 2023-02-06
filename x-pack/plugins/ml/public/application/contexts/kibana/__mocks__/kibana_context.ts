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

export const chartsServiceMock = {
  theme: {
    useChartsTheme: jest.fn(() => {
      return {
        crosshair: {
          line: {
            stroke: 'black',
            strokeWidth: 1,
            dash: [4, 4],
          },
        },
      };
    }),
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
    application: { navigateToApp: jest.fn() },
    http: {
      basePath: {
        get: jest.fn(),
      },
    },
    share: {
      urlGenerators: { getUrlGenerator: jest.fn() },
    },
    data: dataPluginMock.createStartContract(),
    charts: chartsServiceMock,
    fieldFormats: fieldFormatsServiceMock.createStartContract(),
    mlServices: {
      mlApiServices: mlApiServicesMock,
    },
  },
};

export const useMlKibana = jest.fn(() => {
  return kibanaContextMock;
});
