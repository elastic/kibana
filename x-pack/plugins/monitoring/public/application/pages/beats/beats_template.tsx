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

interface BeatsTemplateProps extends PageTemplateProps {
  instance?: any;
}

export const BeatsTemplate: React.FC<BeatsTemplateProps> = ({ instance, ...props }) => {
  const tabs: TabMenuItem[] = [];

  if (!instance) {
    tabs.push({
      id: 'overview',
      label: i18n.translate('xpack.monitoring.beatsNavigation.overviewLinkText', {
        defaultMessage: 'Overview',
      }),
      route: '/beats',
      testSubj: 'beatsOverviewPage',
    });
    tabs.push({
      id: 'instances',
      label: i18n.translate('xpack.monitoring.beatsNavigation.instancesLinkText', {
        defaultMessage: 'Instances',
      }),
      route: '/beats/beats',
      testSubj: 'beatsListingPage',
    });
  } else {
    tabs.push({
      id: 'overview',
      label: i18n.translate('xpack.monitoring.beatsNavigation.instance.overviewLinkText', {
        defaultMessage: 'Overview',
      }),
      route: `/beats/beat/${instance}`,
    });
  }

  return <PageTemplate {...props} tabs={tabs} product="beats" />;
};
