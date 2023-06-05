/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { SecurityPageName } from '@kbn/security-solution-plugin/common';
import { useRootNavLink } from './use_nav_links';

type NavTreeStructureLinks = Array<Omit<NavTreeStructure, 'links'>>;
type NavTreeStructure =
  | {
      id: SecurityPageName;
      appId?: undefined;
      label?: undefined;
      links?: NavTreeStructureLinks;
    }
  | {
      id?: undefined;
      appId: 'dev_tools' | 'discover' | 'ml' | 'fleet';
      label: string;
      links?: NavTreeStructureLinks;
    };

/**
 * It return the basic information of the navigation tree structure.
 * It must be enhanced with extra information before used by UI components.
 */
export const useNavTreeStructure = (): NavTreeStructure[] => {
  const dashboards = useRootNavLink(SecurityPageName.dashboards);
  const explore = useRootNavLink(SecurityPageName.exploreLanding);

  return useMemo(
    () => [
      {
        id: SecurityPageName.dashboards,
        links: [...[...(dashboards?.links?.map(({ id }) => ({ id })) ?? [])]],
      },
      {
        id: SecurityPageName.alerts,
      },
      {
        id: SecurityPageName.cloudSecurityPostureFindings,
      },
      {
        id: SecurityPageName.case,
      },
      {
        appId: 'discover',
        label: 'Investigation',
      },
      {
        id: SecurityPageName.threatIntelligenceIndicators,
      },
      {
        id: SecurityPageName.exploreLanding,
        links: [...[...(explore?.links?.map(({ id }) => ({ id })) ?? [])]],
      },
      {
        appId: 'fleet',
        label: 'Assets',
      },
      {
        id: SecurityPageName.rules,
      },
      {
        appId: 'ml',
        label: 'Machine Learning',
      },
      {
        appId: 'dev_tools',
        label: 'Dev Tools',
      },
      {
        id: SecurityPageName.landing,
      },
      {
        id: SecurityPageName.administration,
      },
    ],
    [dashboards, explore]
  );
};
