/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { TabContent, TabProps } from './shared';

const TabComponent = (props: TabProps) => {
  return <TabContent>Metrics Placeholder</TabContent>;
};

export const MetricsTab = {
  id: 'metrics',
  name: i18n.translate('xpack.infra.nodeDetails.tabs.metrics', {
    defaultMessage: 'Metrics',
  }),
  content: TabComponent,
};
