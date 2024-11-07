/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { i18n } from '@kbn/i18n';
import { PageTemplate } from '../page_template';
import { TabMenuItem, PageTemplateProps } from '../page_template';

export const ApmTemplate: React.FC<React.PropsWithChildren<PageTemplateProps>> = ({ ...props }) => {
  const tabs: TabMenuItem[] = [
    {
      id: 'overview',
      label: i18n.translate('xpack.monitoring.apmNavigation.overviewLinkText', {
        defaultMessage: 'Overview',
      }),
      route: '/apm',
    },
    {
      id: 'instances',
      label: i18n.translate('xpack.monitoring.apmNavigation.instancesLinkText', {
        defaultMessage: 'Instances',
      }),
      route: '/apm/instances',
    },
  ];

  return <PageTemplate {...props} tabs={tabs} product="apm" />;
};
