/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { SecurityPageName } from '@kbn/security-solution-plugin/common';
import { NavigationLink } from '@kbn/security-solution-plugin/public/common/links';
import { useNavLinks } from './use_nav_links';

export type NavTreeStructure =
  | {
      id: SecurityPageName;
      appId?: undefined;
      label?: undefined;
      /**
       * When defined it overrides the default links for the page
       */
      links?: NavTreeStructure[];
    }
  | {
      id?: undefined;
      appId: 'dev_tools' | 'discover' | 'ml' | 'fleet';
      label: string;
      /**
       * When defined it overrides the default links for the page
       */
      links?: NavTreeStructure[];
    };

export const getNavTreeStructure = (navLinks: NavigationLink[]): NavTreeStructure[] => {
  return [
    {
      id: SecurityPageName.dashboards,
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
      id: SecurityPageName.timelines,
    },
    {
      id: SecurityPageName.threatIntelligenceIndicators,
    },
    {
      id: SecurityPageName.exploreLanding,
    },
    {
      appId: 'fleet',
      label: 'Assets',
    },
    {
      id: SecurityPageName.rules,
      links: [],
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
  ];
};
/**
 * It return the basic information of the navigation tree structure.
 * It must be enhanced with extra information before used by UI components.
 */
export const useNavTreeStructure = (): NavTreeStructure[] => {
  const navLinks = useNavLinks();
  const result = useMemo(() => getNavTreeStructure(navLinks), [navLinks]);

  return result;
};
