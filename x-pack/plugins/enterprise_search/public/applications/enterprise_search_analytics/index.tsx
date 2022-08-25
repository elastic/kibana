/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { InitialAppData } from '../../../common/types';

import { AnalyticsCollectionsIndex } from './components/analytics_collections_index/analytics_collections_index';

export const EnterpriseSearchAnalytics: React.FC<InitialAppData> = (props) => {
  return <AnalyticsCollectionsIndex />;
};
