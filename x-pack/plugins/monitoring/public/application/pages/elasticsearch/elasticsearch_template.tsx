/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { i18n } from '@kbn/i18n';
import { includes } from 'lodash';
import { PageTemplate } from '../page_template';
import { TabMenuItem, PageTemplateProps } from '../page_template';
import { ML_SUPPORTED_LICENSES } from '../../../../common/constants';

interface ElasticsearchTemplateProps extends PageTemplateProps {
  cluster?: any;
}

export const ElasticsearchTemplate: React.FC<ElasticsearchTemplateProps> = ({
  cluster,
  ...props
}) => {
  const tabs: TabMenuItem[] = [
    {
      id: 'overview',
      label: i18n.translate('xpack.monitoring.esNavigation.overviewLinkText', {
        defaultMessage: 'Overview',
      }),
      route: '/elasticsearch',
    },
    {
      id: 'nodes',
      label: i18n.translate('xpack.monitoring.esNavigation.nodesLinkText', {
        defaultMessage: 'Nodes',
      }),
      route: '/elasticsearch/nodes',
    },
    {
      id: 'indices',
      label: i18n.translate('xpack.monitoring.esNavigation.indicesLinkText', {
        defaultMessage: 'Indices',
      }),
      route: '/elasticsearch/indices',
    },
  ];

  if (cluster && mlIsSupported(cluster.license)) {
    tabs.push({
      id: 'ml',
      label: i18n.translate('xpack.monitoring.esNavigation.jobsLinkText', {
        defaultMessage: 'Machine learning jobs',
      }),
      route: '/elasticsearch/ml_jobs',
    });
  }

  if (cluster?.isCcrEnabled) {
    tabs.push({
      id: 'ccr',
      label: i18n.translate('xpack.monitoring.esNavigation.ccrLinkText', {
        defaultMessage: 'CCR',
      }),
      route: '/elasticsearch/ccr',
    });
  }

  return <PageTemplate {...props} tabs={tabs} product="elasticsearch" />;
};

const mlIsSupported = (license: any) => includes(ML_SUPPORTED_LICENSES, license.type);
