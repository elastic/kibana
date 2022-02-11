/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { useParams } from 'react-router-dom';

import { APP_ID } from '../../../common/constants';
import { useNavigation } from '../lib/kibana';
import { useCasesContext } from '../../components/cases_context/use_cases_context';
import { CasesDeepLinkId, ICasesDeepLinkId } from './deep_links';
import {
  CASES_CONFIGURE_PATH,
  CASES_CREATE_PATH,
  CaseViewPathParams,
  generateCaseViewPath,
} from './paths';
import { useIsMainApplication } from '../hooks';

export const useCaseViewParams = () => useParams<CaseViewPathParams>();

type GetCasesUrl = (absolute?: boolean) => string;
type NavigateToCases = () => void;
type UseCasesNavigation = [GetCasesUrl, NavigateToCases];

export const useCasesNavigation = ({
  path,
  deepLinkId,
}: {
  path?: string;
  deepLinkId?: ICasesDeepLinkId;
}): UseCasesNavigation => {
  const { appId } = useCasesContext();
  const { navigateTo, getAppUrl } = useNavigation(appId);
  const getCasesUrl = useCallback<GetCasesUrl>(
    (absolute) => getAppUrl({ path, deepLinkId, absolute }),
    [getAppUrl, deepLinkId, path]
  );
  const navigateToCases = useCallback<NavigateToCases>(
    () => navigateTo({ path, deepLinkId }),
    [navigateTo, deepLinkId, path]
  );
  return [getCasesUrl, navigateToCases];
};

/**
 * Cases can be either be part of a solution or a standalone application
 * The standalone application is registered from the cases plugin and is called
 * the main application. The main application uses paths and the solutions
 * deep links.
 */
const navigationMapping = {
  all: { path: '/', deepLinkId: CasesDeepLinkId.cases },
  create: { path: CASES_CREATE_PATH, deepLinkId: CasesDeepLinkId.casesCreate },
  configure: { path: CASES_CONFIGURE_PATH, deepLinkId: CasesDeepLinkId.casesConfigure },
};

const getNavigationArguments = (
  view: keyof typeof navigationMapping,
  isMainApplication: boolean
) => {
  return {
    /**
     * Because the Cases application is a descendant of the stack management plugin
     * we can use the deepLinkId to navigate within the main application. For that reason,
     * the path attribute can be relative to the base path.
     */
    ...(isMainApplication && { path: navigationMapping[view].path, deepLinkId: APP_ID }),
    /**
     * Solutions that use cases navigate in cases only by using deepLinks
     */
    ...(!isMainApplication && { deepLinkId: navigationMapping[view].deepLinkId }),
  };
};

const getAllCasesNavigationArguments = (isMainApplication: boolean) =>
  getNavigationArguments('all', isMainApplication);

const getCreateCaseNavigationArguments = (isMainApplication: boolean) =>
  getNavigationArguments('create', isMainApplication);

const getConfigureCaseNavigationArguments = (isMainApplication: boolean) =>
  getNavigationArguments('configure', isMainApplication);

export const useAllCasesNavigation = () => {
  const isMainApplication = useIsMainApplication();
  const navigationArguments = getAllCasesNavigationArguments(isMainApplication);

  const [getAllCasesUrl, navigateToAllCases] = useCasesNavigation(navigationArguments);

  return { getAllCasesUrl, navigateToAllCases };
};

export const useCreateCaseNavigation = () => {
  const isMainApplication = useIsMainApplication();
  const navigationArguments = getCreateCaseNavigationArguments(isMainApplication);

  const [getCreateCaseUrl, navigateToCreateCase] = useCasesNavigation(navigationArguments);
  return { getCreateCaseUrl, navigateToCreateCase };
};

export const useConfigureCasesNavigation = () => {
  const isMainApplication = useIsMainApplication();
  const navigationArguments = getConfigureCaseNavigationArguments(isMainApplication);

  const [getConfigureCasesUrl, navigateToConfigureCases] = useCasesNavigation(navigationArguments);
  return { getConfigureCasesUrl, navigateToConfigureCases };
};

type GetCaseViewUrl = (pathParams: CaseViewPathParams, absolute?: boolean) => string;
type NavigateToCaseView = (pathParams: CaseViewPathParams) => void;

export const useCaseViewNavigation = () => {
  const { appId } = useCasesContext();
  const { navigateTo, getAppUrl } = useNavigation(appId);
  const isMainApplication = useIsMainApplication();
  const deepLinkId = isMainApplication ? APP_ID : CasesDeepLinkId.cases;

  const getCaseViewUrl = useCallback<GetCaseViewUrl>(
    (pathParams, absolute) =>
      getAppUrl({
        deepLinkId,
        absolute,
        path: generateCaseViewPath(pathParams),
      }),
    [deepLinkId, getAppUrl]
  );

  const navigateToCaseView = useCallback<NavigateToCaseView>(
    (pathParams) =>
      navigateTo({
        deepLinkId,
        path: generateCaseViewPath(pathParams),
      }),
    [navigateTo, deepLinkId]
  );
  return { getCaseViewUrl, navigateToCaseView };
};
