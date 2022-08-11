/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TabNavigationProps } from '../tab_navigation/types';
import type { GenericNavRecord } from '../types';

export interface PrimaryNavigationItemsProps {
  navTabs: GenericNavRecord;
  selectedTabId: string;
}

export type PrimaryNavigationProps = Omit<TabNavigationProps, 'pathName' | 'tabName'>;
