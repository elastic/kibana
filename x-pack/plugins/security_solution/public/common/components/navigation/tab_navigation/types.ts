/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SecuritySolutionTabNavigationProps } from '../types';

export interface TabNavigationProps extends SecuritySolutionTabNavigationProps {
  pathName: string;
  pageName: string;
  tabName?: string;
}

export interface TabNavigationItemProps {
  hrefWithSearch: string;
  id: string;
  disabled: boolean;
  name: string;
  isSelected: boolean;
  isBeta?: boolean;
  betaOptions?: {
    text: string;
  };
}
