/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { useNavigation } from '../lib/kibana';
import { useCasesContext } from '../../components/cases_context/use_cases_context';
import { casesDeepLinkIds } from './deep_links';
import { CasesViewPathParams, generateCasesDetailPath } from './paths';

export const useAllCasesNavigation = () => {
  const { appId } = useCasesContext();
  const { navigateTo, getAppUrl } = useNavigation(appId);
  const getUrl = useCallback(
    (absolute?: boolean) => getAppUrl({ deepLinkId: casesDeepLinkIds.cases, absolute }),
    [getAppUrl]
  );
  const navigate = useCallback(
    () => navigateTo({ deepLinkId: casesDeepLinkIds.cases }),
    [navigateTo]
  );
  return { getUrl, navigate };
};

export const useCreateCaseNavigation = () => {
  const { appId } = useCasesContext();
  const { navigateTo, getAppUrl } = useNavigation(appId);
  const getUrl = useCallback(
    (absolute?: boolean) => getAppUrl({ deepLinkId: casesDeepLinkIds.casesCreate, absolute }),
    [getAppUrl]
  );
  const navigate = useCallback(
    () => navigateTo({ deepLinkId: casesDeepLinkIds.casesCreate }),
    [navigateTo]
  );
  return { getUrl, navigate };
};

export const useCaseViewNavigation = () => {
  const { appId } = useCasesContext();
  const { navigateTo, getAppUrl } = useNavigation(appId);
  const getUrl = useCallback(
    (pathParams: CasesViewPathParams, absolute?: boolean) =>
      getAppUrl({
        deepLinkId: casesDeepLinkIds.cases,
        absolute,
        path: generateCasesDetailPath(pathParams),
      }),
    [getAppUrl]
  );
  const navigate = useCallback(
    (pathParams: CasesViewPathParams) =>
      navigateTo({ deepLinkId: casesDeepLinkIds.cases, path: generateCasesDetailPath(pathParams) }),
    [navigateTo]
  );
  return { getUrl, navigate };
};

export const useConfigureCasesNavigation = () => {
  const { appId } = useCasesContext();
  const { navigateTo, getAppUrl } = useNavigation(appId);
  const getUrl = useCallback(
    (absolute?: boolean) => getAppUrl({ deepLinkId: casesDeepLinkIds.casesConfigure, absolute }),
    [getAppUrl]
  );
  const navigate = useCallback(
    () => navigateTo({ deepLinkId: casesDeepLinkIds.casesConfigure }),
    [navigateTo]
  );
  return { getUrl, navigate };
};
