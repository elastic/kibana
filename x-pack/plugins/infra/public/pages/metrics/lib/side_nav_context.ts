/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

export interface SubNavItem {
  id: string;
  name: string;
  onClick: () => void;
}

export interface NavItem {
  id: string | number;
  name: string;
  items: SubNavItem[];
}

export const SideNavContext = React.createContext({
  items: [] as NavItem[],
  addNavItem: (item: NavItem) => {},
});
