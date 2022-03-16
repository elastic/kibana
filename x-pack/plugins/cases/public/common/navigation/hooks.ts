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
import { ICasesDeepLinkId } from './deep_links';
import {
  CASES_CONFIGURE_PATH,
  CASES_CREATE_PATH,
  CaseViewPathParams,
  generateCaseViewPath,
} from './paths';

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
  all: { path: '/' },
  create: { path: CASES_CREATE_PATH },
  configure: { path: CASES_CONFIGURE_PATH },
};

export const useAllCasesNavigation = () => {
  const [getAllCasesUrl, navigateToAllCases] = useCasesNavigation({
    path: navigationMapping.all.path,
    deepLinkId: APP_ID,
  });

  return { getAllCasesUrl, navigateToAllCases };
};

export const useCreateCaseNavigation = () => {
  const [getCreateCaseUrl, navigateToCreateCase] = useCasesNavigation({
    path: navigationMapping.create.path,
    deepLinkId: APP_ID,
  });
  return { getCreateCaseUrl, navigateToCreateCase };
};

export const useConfigureCasesNavigation = () => {
  const [getConfigureCasesUrl, navigateToConfigureCases] = useCasesNavigation({
    path: navigationMapping.configure.path,
    deepLinkId: APP_ID,
  });
  return { getConfigureCasesUrl, navigateToConfigureCases };
};

type GetCaseViewUrl = (pathParams: CaseViewPathParams, absolute?: boolean) => string;
type NavigateToCaseView = (pathParams: CaseViewPathParams) => void;

export const useCaseViewNavigation = () => {
  const { appId } = useCasesContext();
  const { navigateTo, getAppUrl } = useNavigation(appId);
  const deepLinkId = APP_ID;

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
