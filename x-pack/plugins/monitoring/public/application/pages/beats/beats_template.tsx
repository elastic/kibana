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

interface BeatsTemplateProps extends PageTemplateProps {
  cluster: any;
}

export const BeatsTemplate: React.FC<BeatsTemplateProps> = ({ cluster, ...props }) => {
  const tabs: TabMenuItem[] = [
    {
      id: 'overview',
      label: i18n.translate('xpack.monitoring.beatsNavigation.overviewLinkText', {
        defaultMessage: 'Overview',
      }),
      route: '/beats',
    },
    {
      id: 'instances',
      label: i18n.translate('xpack.monitoring.beatsNavigation.instancesLinkText', {
        defaultMessage: 'Instances',
      }),
      route: '/beats/beats',
    },
  ];

  return <PageTemplate {...props} tabs={tabs} product="beats" />;
};
