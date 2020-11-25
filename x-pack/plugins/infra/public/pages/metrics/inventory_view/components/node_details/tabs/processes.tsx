/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { TabContent, TabProps } from './shared';

const TabComponent = (props: TabProps) => {
  return <TabContent>Processes Placeholder</TabContent>;
};

export const ProcessesTab = {
  id: 'processes',
  name: i18n.translate('xpack.infra.nodeDetails.tabs.processes', {
    defaultMessage: 'Processes',
  }),
  content: TabComponent,
};
