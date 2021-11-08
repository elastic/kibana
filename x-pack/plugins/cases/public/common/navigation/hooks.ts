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
import { CasesDeepLinkIds } from './deep_links';
import { CaseViewPathParams, generateCaseViewPath } from './paths';

export const useCaseViewParams = () => useParams<CaseViewPathParams>();

export const useAllCasesNavigation = () => {
  const { appId } = useCasesContext();
  const { navigateTo, getAppUrl } = useNavigation(appId);
  const getAllCasesUrl = useCallback(
    (absolute?: boolean) => getAppUrl({ deepLinkId: CasesDeepLinkIds.cases, absolute }),
    [getAppUrl]
  );
  const navigateToAllCases = useCallback(
    () => navigateTo({ deepLinkId: CasesDeepLinkIds.cases }),
    [navigateTo]
  );
  return { getAllCasesUrl, navigateToAllCases };
};

export const useCreateCaseNavigation = () => {
  const { appId } = useCasesContext();
  const { navigateTo, getAppUrl } = useNavigation(appId);
  const getCreateCaseUrl = useCallback(
    (absolute?: boolean) => getAppUrl({ deepLinkId: CasesDeepLinkIds.casesCreate, absolute }),
    [getAppUrl]
  );
  const navigateToCreateCase = useCallback(
    () => navigateTo({ deepLinkId: CasesDeepLinkIds.casesCreate }),
    [navigateTo]
  );
  return { getCreateCaseUrl, navigateToCreateCase };
};

export const useCaseViewNavigation = () => {
  const { appId } = useCasesContext();
  const { navigateTo, getAppUrl } = useNavigation(appId);
  const getCaseViewUrl = useCallback(
    (pathParams: CaseViewPathParams, absolute?: boolean) =>
      getAppUrl({
        deepLinkId: CasesDeepLinkIds.cases,
        absolute,
        path: generateCaseViewPath(pathParams),
      }),
    [getAppUrl]
  );
  const navigateToCaseView = useCallback(
    (pathParams: CaseViewPathParams) =>
      navigateTo({ deepLinkId: CasesDeepLinkIds.cases, path: generateCaseViewPath(pathParams) }),
    [navigateTo]
  );
  return { getCaseViewUrl, navigateToCaseView };
};

export const useConfigureCasesNavigation = () => {
  const { appId } = useCasesContext();
  const { navigateTo, getAppUrl } = useNavigation(appId);
  const getConfigureCasesUrl = useCallback(
    (absolute?: boolean) => getAppUrl({ deepLinkId: CasesDeepLinkIds.casesConfigure, absolute }),
    [getAppUrl]
  );
  const navigateToConfigureCases = useCallback(
    () => navigateTo({ deepLinkId: CasesDeepLinkIds.casesConfigure }),
    [navigateTo]
  );
  return { getConfigureCasesUrl, navigateToConfigureCases };
};
