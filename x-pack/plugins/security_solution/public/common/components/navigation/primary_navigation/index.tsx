/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiPageSideBar, EuiSideNav } from '@elastic/eui';
import { usePrimaryNavigation } from './use_primary_navigation';
import { SecuritySolutionNavigationProps } from '../types';

export const SecuritySolutionNavigation: React.FC<SecuritySolutionNavigationProps> = React.memo(
  ({ navTabs, pageName, tabName, urlState }) => {
    const navItems = usePrimaryNavigation({
      query: urlState.query,
      filters: urlState.filters,
      navTabs,
      pageName,
      sourcerer: urlState.sourcerer,
      savedQuery: urlState.savedQuery,
      tabName,
      timeline: urlState.timeline,
      timerange: urlState.timerange,
    });

    return (
      <EuiPageSideBar>
        <EuiSideNav items={navItems} />
      </EuiPageSideBar>
    );
  }
);
