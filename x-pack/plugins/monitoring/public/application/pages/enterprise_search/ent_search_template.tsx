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

interface EntSearchTemplateProps extends PageTemplateProps {
  node?: any;
}

export const EntSearchTemplate: React.FC<EntSearchTemplateProps> = ({ node, ...props }) => {
  const tabs: TabMenuItem[] = [];

  if (!node) {
    tabs.push({
      id: 'overview',
      label: i18n.translate('xpack.monitoring.entSearchNavigation.overviewLinkText', {
        defaultMessage: 'Overview',
      }),
      route: '/enterprise_search',
    });
    tabs.push({
      id: 'nodes',
      label: i18n.translate('xpack.monitoring.entSearchNavigation.nodesLinkText', {
        defaultMessage: 'Nodes',
      }),
      route: '/enterprise_search/nodes',
    });
  } else {
    tabs.push({
      id: 'overview',
      label: i18n.translate('xpack.monitoring.entSearchNavigation.node.overviewLinkText', {
        defaultMessage: 'Overview',
      }),
      route: `/enterprise_search/nodes/${node}`,
    });
  }

  return <PageTemplate {...props} tabs={tabs} product="enterprise_search" />;
};
