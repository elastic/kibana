/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import SemVer from 'semver/classes/semver';
import {
  deprecationsServiceMock,
  docLinksServiceMock,
  notificationServiceMock,
  applicationServiceMock,
  httpServiceMock,
  coreMock,
  scopedHistoryMock,
} from '@kbn/core/public/mocks';
import { sharePluginMock } from '@kbn/share-plugin/public/mocks';

import { apiService } from '../../../public/application/lib/api';
import { breadcrumbService } from '../../../public/application/lib/breadcrumbs';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import { cloudMock } from '@kbn/cloud-plugin/public/mocks';
import { OBS_LOGS_EXPLORER_DATA_VIEW_LOCATOR_ID } from '@kbn/deeplinks-observability';

const data = dataPluginMock.createStartContract();
const dataViews = { ...data.dataViews };
const findDataView = (id: string) =>
  Promise.resolve([
    {
      id,
      title: id,
      getFieldByName: jest.fn((name: string) => ({
        name,
      })),
    },
  ]);

const servicesMock = {
  api: apiService,
  breadcrumbs: breadcrumbService,
  data: {
    ...data,
    dataViews: {
      ...dataViews,
      find: findDataView,
    },
  },
};

// We'll mock these values to avoid testing the locators themselves.
const idToUrlMap = {
  SNAPSHOT_RESTORE_LOCATOR: 'snapshotAndRestoreUrl',
  DISCOVER_APP_LOCATOR: 'discoverUrl',
  [OBS_LOGS_EXPLORER_DATA_VIEW_LOCATOR_ID]: 'logsExplorerUrl',
};
type IdKey = keyof typeof idToUrlMap;

export const stringifySearchParams = (params: Record<string, any>) => {
  const stringifiedParams = Object.keys(params).reduce((list, key) => {
    const value = typeof params[key] === 'object' ? JSON.stringify(params[key]) : params[key];

    return { ...list, [key]: value };
  }, {});

  return new URLSearchParams(stringifiedParams).toString();
};

const shareMock = sharePluginMock.createSetupContract();
// @ts-expect-error This object is missing some properties that we're not using in the UI
shareMock.url.locators.get = (id: IdKey) => ({
  useUrl: (): string | undefined => idToUrlMap[id],
  getUrl: (params: Record<string, any>): string | undefined =>
    `${idToUrlMap[id]}?${stringifySearchParams(params)}`,
  getRedirectUrl: (params: Record<string, any>): string | undefined =>
    `${idToUrlMap[id]}?${stringifySearchParams(params)}`,
});

export const getAppContextMock = (kibanaVersion: SemVer) => ({
  featureSet: {
    mlSnapshots: true,
    migrateSystemIndices: true,
    reindexCorrectiveActions: true,
  },
  kibanaVersionInfo: {
    currentMajor: kibanaVersion.major,
    prevMajor: kibanaVersion.major - 1,
    nextMajor: kibanaVersion.major + 1,
  },
  services: {
    ...servicesMock,
    core: {
      ...coreMock.createStart(),
      http: httpServiceMock.createSetupContract(),
      deprecations: deprecationsServiceMock.createStartContract(),
      notifications: notificationServiceMock.createStartContract(),
      docLinks: docLinksServiceMock.createStartContract(),
      history: scopedHistoryMock.create(),
      application: {
        ...applicationServiceMock.createStartContract(),
        capabilities: {
          spaces: {
            manage: true,
          },
        },
      },
    },
  },
  plugins: {
    share: shareMock,
    infra: undefined,
    cloud: {
      ...cloudMock.createSetup(),
      isCloudEnabled: false,
    },
  },
  clusterUpgradeState: 'isPreparingForUpgrade',
  isClusterUpgradeStateError: () => {},
  handleClusterUpgradeStateError: () => {},
});
