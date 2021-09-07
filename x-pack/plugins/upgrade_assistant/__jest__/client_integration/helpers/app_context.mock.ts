/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  deprecationsServiceMock,
  docLinksServiceMock,
  notificationServiceMock,
  applicationServiceMock,
  httpServiceMock,
  coreMock,
  scopedHistoryMock,
} from 'src/core/public/mocks';
import { sharePluginMock } from 'src/plugins/share/public/mocks';

import { mockKibanaSemverVersion } from '../../../common/constants';
import { apiService } from '../../../public/application/lib/api';
import { breadcrumbService } from '../../../public/application/lib/breadcrumbs';
import { dataPluginMock } from '../../../../../../src/plugins/data/public/mocks';
import { cloudMock } from '../../../../../../x-pack/plugins/cloud/public/mocks';

const servicesMock = {
  api: apiService,
  breadcrumbs: breadcrumbService,
  data: dataPluginMock.createStartContract(),
};

// We'll mock these values to avoid testing the locators themselves.
const idToUrlMap = {
  SNAPSHOT_RESTORE_LOCATOR: 'snapshotAndRestoreUrl',
  DISCOVER_APP_LOCATOR: 'discoverUrl',
};

const shareMock = sharePluginMock.createSetupContract();
shareMock.url.locators.get = (id) => ({
  // @ts-expect-error This object is missing some properties that we're not using in the UI
  useUrl: (): string | undefined => idToUrlMap[id],
  // @ts-expect-error This object is missing some properties that we're not using in the UI
  getUrl: (): string | undefined => idToUrlMap[id],
});

export const getAppContextMock = () => ({
  isReadOnlyMode: false,
  kibanaVersionInfo: {
    currentMajor: mockKibanaSemverVersion.major,
    prevMajor: mockKibanaSemverVersion.major - 1,
    nextMajor: mockKibanaSemverVersion.major + 1,
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
      application: applicationServiceMock.createStartContract(),
    },
  },
  plugins: {
    share: shareMock,
    cloud: {
      ...cloudMock.createSetup(),
      isCloudEnabled: false,
    },
  },
});
