/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SECURITY_SOLUTION_OWNER } from '@kbn/cases-plugin/common';
import type { AppDeepLinkId } from '@kbn/core-chrome-browser';
import type { FtrProviderContext } from '../../../functional/ftr_provider_context';

export const createOneCaseBeforeDeleteAllAfter = (
  getPageObject: FtrProviderContext['getPageObject'],
  getService: FtrProviderContext['getService'],
  owner: string
) => {
  const svlCases = getService('svlCases');

  before(async () => {
    await createAndNavigateToCase(getPageObject, getService, owner);
  });

  after(async () => {
    await svlCases.api.deleteAllCaseItems();
  });
};

export const createOneCaseBeforeEachDeleteAllAfterEach = (
  getPageObject: FtrProviderContext['getPageObject'],
  getService: FtrProviderContext['getService'],
  owner: string
) => {
  const svlCases = getService('svlCases');

  beforeEach(async () => {
    await createAndNavigateToCase(getPageObject, getService, owner);
  });

  afterEach(async () => {
    await svlCases.api.deleteAllCaseItems();
  });
};

export const createAndNavigateToCase = async (
  getPageObject: FtrProviderContext['getPageObject'],
  getService: FtrProviderContext['getService'],
  owner: string
) => {
  const cases = getService('cases');

  const header = getPageObject('header');

  await navigateToCasesApp(getPageObject, getService, owner);

  const theCase = await cases.api.createCase({ owner });
  await cases.casesTable.waitForCasesToBeListed();
  await cases.casesTable.goToFirstListedCase();
  await header.waitUntilLoadingHasFinished();

  return theCase;
};

export const navigateToCasesApp = async (
  getPageObject: FtrProviderContext['getPageObject'],
  getService: FtrProviderContext['getService'],
  owner: string
) => {
  const common = getPageObject('common');
  const header = getPageObject('header');
  const svlCommonNavigation = getPageObject('svlCommonNavigation');
  const retry = getService('retry');
  const testSubjects = getService('testSubjects');

  await common.navigateToApp('landingPage');
  await header.waitUntilLoadingHasFinished();

  const link =
    owner === SECURITY_SOLUTION_OWNER
      ? { deepLinkId: 'securitySolutionUI:cases' as AppDeepLinkId }
      : { deepLinkId: 'observability-overview:cases' as AppDeepLinkId };

  await retry.tryForTime(30000, async () => {
    await svlCommonNavigation.sidenav.clickLink(link);
    await testSubjects.existOrFail('createNewCaseBtn', { timeout: 5000 });
  });
};
