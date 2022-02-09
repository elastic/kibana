/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useNavigation } from '../lib/kibana';
import { useCasesContext } from '../../components/cases_context/use_cases_context';
import { CasesDeepLinkId, ICasesDeepLinkId } from './deep_links';
import { CaseViewPathParams, generateCaseViewPath } from './paths';
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

const getNavigationArguments = (
  isMainApplication: boolean,
  path: string,
  deepLinkId: ICasesDeepLinkId
) => ({
  ...(isMainApplication && { path }),
  ...(!isMainApplication && { deepLinkId }),
});

const getAllCasesNavigationArguments = (isMainApplication: boolean) =>
  getNavigationArguments(isMainApplication, '/insightsAndAlerting/cases', CasesDeepLinkId.cases);

const getCreateCaseNavigationArguments = (isMainApplication: boolean) =>
  getNavigationArguments(
    isMainApplication,
    '/insightsAndAlerting/cases/create',
    CasesDeepLinkId.casesCreate
  );

const getConfigureCaseNavigationArguments = (isMainApplication: boolean) =>
  getNavigationArguments(
    isMainApplication,
    '/insightsAndAlerting/cases/configure',
    CasesDeepLinkId.casesConfigure
  );

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

  const getCaseViewUrl = useCallback<GetCaseViewUrl>(
    (pathParams, absolute) =>
      getAppUrl({
        ...(!isMainApplication && { deepLinkId: CasesDeepLinkId.cases }),
        absolute,
        path: isMainApplication
          ? `/insightsAndAlerting/cases/${generateCaseViewPath(pathParams)}`
          : generateCaseViewPath(pathParams),
      }),
    [getAppUrl, isMainApplication]
  );

  const navigateToCaseView = useCallback<NavigateToCaseView>(
    (pathParams) =>
      navigateTo({
        ...(!isMainApplication && { deepLinkId: CasesDeepLinkId.cases }),
        path: isMainApplication
          ? `/insightsAndAlerting/cases/${generateCaseViewPath(pathParams)}`
          : generateCaseViewPath(pathParams),
      }),
    [navigateTo, isMainApplication]
  );
  return { getCaseViewUrl, navigateToCaseView };
};
