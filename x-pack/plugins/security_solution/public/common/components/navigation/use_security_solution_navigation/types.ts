/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TabNavigationProps } from '../tab_navigation/types';

export type PrimaryNavigationItemsProps = Omit<
  TabNavigationProps,
  'pathName' | 'pageName' | 'tabName'
> & { selectedTabId: string };

export type PrimaryNavigationProps = Omit<TabNavigationProps, 'pathName'>;
