/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { i18n } from '@kbn/i18n';
import { PageTemplate, TabMenuItem, PageTemplateProps } from '../page_template';

export const KibanaTemplate: React.FC<PageTemplateProps> = ({ ...props }) => {
  const tabs: TabMenuItem[] = [
    {
      id: 'overview',
      label: i18n.translate('xpack.monitoring.kibanaNavigation.overviewLinkText', {
        defaultMessage: 'Overview',
      }),
      route: '/kibana',
      testSubj: 'kibanaOverviewPage',
    },
    {
      id: 'instances',
      label: i18n.translate('xpack.monitoring.kibanaNavigation.instancesLinkText', {
        defaultMessage: 'Instances',
      }),
      route: '/kibana/instances',
      testSubj: 'kibanaInstancesPage',
    },
  ];

  return <PageTemplate {...props} tabs={tabs} product="kibana" />;
};
