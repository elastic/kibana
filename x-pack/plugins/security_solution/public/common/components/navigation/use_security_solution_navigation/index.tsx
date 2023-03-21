/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect } from 'react';
import { omit } from 'lodash/fp';
import { usePrimaryNavigation } from './use_primary_navigation';
import { useKibana } from '../../../lib/kibana';
import { useSetBreadcrumbs } from '../breadcrumbs';
import { useRouteSpy } from '../../../utils/route/use_route_spy';
import { navTabs } from '../../../../app/home/home_navigations';
import { useIsExperimentalFeatureEnabled } from '../../../hooks/use_experimental_features';
import type { GenericNavRecord } from '../types';

/**
 * @description - This hook provides the structure necessary by the KibanaPageTemplate for rendering the primary security_solution side navigation.
 * TODO: Consolidate & re-use the logic in the hooks in this directory that are replicated from the tab_navigation to maintain breadcrumbs, telemetry, etc...
 */
export const useSecuritySolutionNavigation = () => {
  const [routeProps] = useRouteSpy();

  const {
    chrome,
    application: { getUrlForApp, navigateToUrl },
  } = useKibana().services;

  const disabledNavTabs = [
    ...(!useIsExperimentalFeatureEnabled('kubernetesEnabled') ? ['kubernetes'] : []),
  ];
  const enabledNavTabs: GenericNavRecord = omit(disabledNavTabs, navTabs);

  const setBreadcrumbs = useSetBreadcrumbs();

  useEffect(() => {
    if (!routeProps.pathName && !routeProps.pageName) {
      return;
    }

    setBreadcrumbs({ ...routeProps, navTabs }, chrome, navigateToUrl);
  }, [routeProps, chrome, getUrlForApp, navigateToUrl, enabledNavTabs, setBreadcrumbs]);

  return usePrimaryNavigation({
    navTabs: enabledNavTabs,
    pageName: routeProps.pageName,
  });
};
