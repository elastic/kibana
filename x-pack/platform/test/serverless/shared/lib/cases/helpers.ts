/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SECURITY_SOLUTION_OWNER } from '@kbn/cases-plugin/common';
import type { AppDeepLinkId } from '@kbn/core-chrome-browser';

interface CasesService {
  api: {
    createCase(params: { owner: string }): Promise<Record<string, unknown>>;
  };
  casesTable: {
    waitForCasesToBeListed(): Promise<void>;
    goToFirstListedCase(): Promise<void>;
  };
}

interface SvlCasesService {
  api: {
    deleteAllCaseItems(): Promise<void>;
  };
}

interface HeaderPageObject {
  waitUntilLoadingHasFinished(): Promise<void>;
}

interface CommonPageObject {
  navigateToApp(appId: string): Promise<void>;
}

interface SidenavPageObject {
  clickLink(params: { deepLinkId: AppDeepLinkId | 'observability-overview:cases' }): Promise<void>;
}

interface SvlCommonNavigationPageObject {
  sidenav: SidenavPageObject;
}

interface CasePageObjects {
  common: CommonPageObject;
  header: HeaderPageObject;
  svlCommonNavigation: SvlCommonNavigationPageObject;
}

interface CaseServices {
  cases: CasesService;
  svlCases: SvlCasesService;
}

type GetCasePageObject = <TName extends keyof CasePageObjects>(
  name: TName
) => CasePageObjects[TName];

type GetCaseService = <TName extends keyof CaseServices>(name: TName) => CaseServices[TName];

export const createOneCaseBeforeDeleteAllAfter = (
  getPageObject: GetCasePageObject,
  getService: GetCaseService,
  owner: string
): void => {
  const svlCases = getService('svlCases');

  before(async () => {
    await createAndNavigateToCase(getPageObject, getService, owner);
  });

  after(async () => {
    await svlCases.api.deleteAllCaseItems();
  });
};

export const createOneCaseBeforeEachDeleteAllAfterEach = (
  getPageObject: GetCasePageObject,
  getService: GetCaseService,
  owner: string
): void => {
  const svlCases = getService('svlCases');

  beforeEach(async () => {
    await createAndNavigateToCase(getPageObject, getService, owner);
  });

  afterEach(async () => {
    await svlCases.api.deleteAllCaseItems();
  });
};

export const createAndNavigateToCase = async (
  getPageObject: GetCasePageObject,
  getService: GetCaseService,
  owner: string
): Promise<Record<string, unknown>> => {
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
  getPageObject: GetCasePageObject,
  getService: GetCaseService,
  owner: string
): Promise<void> => {
  const common = getPageObject('common');
  const svlCommonNavigation = getPageObject('svlCommonNavigation');

  await common.navigateToApp('landingPage');

  if (owner === SECURITY_SOLUTION_OWNER) {
    await svlCommonNavigation.sidenav.clickLink({
      deepLinkId: 'securitySolutionUI:cases' as AppDeepLinkId,
    });
  } else {
    await svlCommonNavigation.sidenav.clickLink({ deepLinkId: 'observability-overview:cases' });
  }
};
