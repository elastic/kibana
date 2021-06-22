/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';

import { isFullLicense } from '../../license';

import { MainTabs } from './main_tabs';

export type TabId =
  | 'access-denied'
  | 'anomaly_detection'
  | 'data_frame_analytics'
  | 'datavisualizer'
  | 'overview'
  | 'settings';

interface Props {
  tabId: TabId;
}

export const NavigationMenu: FC<Props> = ({ tabId }) => {
  const disableLinks = isFullLicense() === false;

  return <MainTabs tabId={tabId} disableLinks={disableLinks} />;
};
