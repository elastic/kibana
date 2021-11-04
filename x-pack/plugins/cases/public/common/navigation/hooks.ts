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
import { casesDeepLinkIds } from './deep_links';
import { CaseViewPathParams, generateCaseViewPath } from './paths';

export const useCaseViewParams = () => useParams<CaseViewPathParams>();

export const useAllCasesNavigation = () => {
  const { appId } = useCasesContext();
  const { navigateTo, getAppUrl } = useNavigation(appId);
  const getAllCasesUrl = useCallback(
    (absolute?: boolean) => getAppUrl({ deepLinkId: casesDeepLinkIds.cases, absolute }),
    [getAppUrl]
  );
  const navigateToAllCases = useCallback(
    () => navigateTo({ deepLinkId: casesDeepLinkIds.cases }),
    [navigateTo]
  );
  return { getAllCasesUrl, navigateToAllCases };
};

export const useCreateCaseNavigation = () => {
  const { appId } = useCasesContext();
  const { navigateTo, getAppUrl } = useNavigation(appId);
  const getCreateCaseUrl = useCallback(
    (absolute?: boolean) => getAppUrl({ deepLinkId: casesDeepLinkIds.casesCreate, absolute }),
    [getAppUrl]
  );
  const navigateToCreateCase = useCallback(
    () => navigateTo({ deepLinkId: casesDeepLinkIds.casesCreate }),
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
        deepLinkId: casesDeepLinkIds.cases,
        absolute,
        path: generateCaseViewPath(pathParams),
      }),
    [getAppUrl]
  );
  const navigateToCaseView = useCallback(
    (pathParams: CaseViewPathParams) =>
      navigateTo({ deepLinkId: casesDeepLinkIds.cases, path: generateCaseViewPath(pathParams) }),
    [navigateTo]
  );
  return { getCaseViewUrl, navigateToCaseView };
};

export const useConfigureCasesNavigation = () => {
  const { appId } = useCasesContext();
  const { navigateTo, getAppUrl } = useNavigation(appId);
  const getConfigureCasesUrl = useCallback(
    (absolute?: boolean) => getAppUrl({ deepLinkId: casesDeepLinkIds.casesConfigure, absolute }),
    [getAppUrl]
  );
  const navigateToConfigureCases = useCallback(
    () => navigateTo({ deepLinkId: casesDeepLinkIds.casesConfigure }),
    [navigateTo]
  );
  return { getConfigureCasesUrl, navigateToConfigureCases };
};
