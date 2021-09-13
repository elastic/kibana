/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { i18n } from '@kbn/i18n';
import { PageTemplate } from '../page_template';
import { TabMenuItem } from '../page_template';

export const ElasticsearchTemplate: React.FC<{}> = ({ children, ...props }) => {
  const tabs: TabMenuItem[] = [
    {
      id: 'overview',
      label: i18n.translate('xpack.monitoring.esNavigation.overviewLinkText', {
        defaultMessage: 'Overview',
      }),
      disabled: false,
      route: '/elasticsearch',
    },
    {
      id: 'nodes',
      label: i18n.translate('xpack.monitoring.esNavigation.nodesLinkText', {
        defaultMessage: 'Nodes',
      }),
      disabled: false,
      route: '/elasticsearch/nodes',
    },
    {
      id: 'indices',
      label: i18n.translate('xpack.monitoring.esNavigation.indicesLinkText', {
        defaultMessage: 'Indices',
      }),
      disabled: false,
      route: '/elasticsearch/indices',
    },
    {
      id: 'ml',
      label: i18n.translate('xpack.monitoring.esNavigation.jobsLinkText', {
        defaultMessage: 'Machine learning jobs',
      }),
      disabled: false,
      route: '/elasticsearch/ml_jobs',
    },
    {
      id: 'ccr',
      label: i18n.translate('xpack.monitoring.esNavigation.ccrLinkText', {
        defaultMessage: 'CCR',
      }),
      disabled: false,
      route: '/elasticsearch/ccr',
    },
    // {
    //   id: 'advanced',
    //   label: i18n.translate('xpack.monitoring.esNavigation.instance.advancedLinkText', {
    //     defaultMessage: 'Advanced',
    //   }),
    //   disabled: false,
    // },
  ];

  return (
    <PageTemplate {...props} tabs={tabs}>
      {children}
    </PageTemplate>
  );
};
