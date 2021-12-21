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

export const useCaseViewParams = () => useParams<CaseViewPathParams>();

type GetCasesUrl = (absolute?: boolean) => string;
type NavigateToCases = () => void;
type UseCasesNavigation = [GetCasesUrl, NavigateToCases];

export const useCasesNavigation = (deepLinkId: ICasesDeepLinkId): UseCasesNavigation => {
  const { appId } = useCasesContext();
  const { navigateTo, getAppUrl } = useNavigation(appId);
  const getCasesUrl = useCallback<GetCasesUrl>(
    (absolute) => getAppUrl({ deepLinkId, absolute }),
    [getAppUrl, deepLinkId]
  );
  const navigateToCases = useCallback<NavigateToCases>(
    () => navigateTo({ deepLinkId }),
    [navigateTo, deepLinkId]
  );
  return [getCasesUrl, navigateToCases];
};

export const useAllCasesNavigation = () => {
  const [getAllCasesUrl, navigateToAllCases] = useCasesNavigation(CasesDeepLinkId.cases);
  return { getAllCasesUrl, navigateToAllCases };
};

export const useCreateCaseNavigation = () => {
  const [getCreateCaseUrl, navigateToCreateCase] = useCasesNavigation(CasesDeepLinkId.casesCreate);
  return { getCreateCaseUrl, navigateToCreateCase };
};

export const useConfigureCasesNavigation = () => {
  const [getConfigureCasesUrl, navigateToConfigureCases] = useCasesNavigation(
    CasesDeepLinkId.casesConfigure
  );
  return { getConfigureCasesUrl, navigateToConfigureCases };
};

type GetCaseViewUrl = (pathParams: CaseViewPathParams, absolute?: boolean) => string;
type NavigateToCaseView = (pathParams: CaseViewPathParams) => void;

export const useCaseViewNavigation = () => {
  const { appId } = useCasesContext();
  const { navigateTo, getAppUrl } = useNavigation(appId);
  const getCaseViewUrl = useCallback<GetCaseViewUrl>(
    (pathParams, absolute) =>
      getAppUrl({
        deepLinkId: CasesDeepLinkId.cases,
        absolute,
        path: generateCaseViewPath(pathParams),
      }),
    [getAppUrl]
  );
  const navigateToCaseView = useCallback<NavigateToCaseView>(
    (pathParams) =>
      navigateTo({ deepLinkId: CasesDeepLinkId.cases, path: generateCaseViewPath(pathParams) }),
    [navigateTo]
  );
  return { getCaseViewUrl, navigateToCaseView };
};
