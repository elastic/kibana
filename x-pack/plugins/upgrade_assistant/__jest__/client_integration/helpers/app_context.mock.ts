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
} from 'src/core/public/mocks';
import { sharePluginMock } from 'src/plugins/share/public/mocks';
import { HttpSetup } from 'src/core/public';

import { mockKibanaSemverVersion } from '../../../common/constants';
import { apiService } from '../../../public/application/lib/api';
import { breadcrumbService } from '../../../public/application/lib/breadcrumbs';

// We'll mock these values to avoid testing the locators themselves.
const idToUrlMap = {
  SNAPSHOT_RESTORE_LOCATOR: 'snapshotAndRestoreUrl',
};

const shareMock = sharePluginMock.createSetupContract();
shareMock.url.locators.get = (id) => ({
  // @ts-expect-error This object is missing some properties that we're not using in the UI
  useUrl: (): string | undefined => idToUrlMap[id],
});

export const getAppContextMock = (mockHttpClient: HttpSetup) => ({
  http: mockHttpClient,
  docLinks: docLinksServiceMock.createStartContract(),
  kibanaVersionInfo: {
    currentMajor: mockKibanaSemverVersion.major,
    prevMajor: mockKibanaSemverVersion.major - 1,
    nextMajor: mockKibanaSemverVersion.major + 1,
  },
  notifications: notificationServiceMock.createStartContract(),
  isReadOnlyMode: false,
  api: apiService,
  breadcrumbs: breadcrumbService,
  getUrlForApp: applicationServiceMock.createStartContract().getUrlForApp,
  deprecations: deprecationsServiceMock.createStartContract(),
  share: shareMock,
});
