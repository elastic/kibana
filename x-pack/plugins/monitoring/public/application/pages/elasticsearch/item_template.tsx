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

interface ItemTemplateProps extends PageTemplateProps {
  id: string;
  pageType: string;
}
export const ItemTemplate: React.FC<ItemTemplateProps> = (props) => {
  const { pageType, id, ...rest } = props;
  const tabs: TabMenuItem[] = [
    {
      id: 'overview',
      label: i18n.translate('xpack.monitoring.esItemNavigation.overviewLinkText', {
        defaultMessage: 'Overview',
      }),
      route: `/elasticsearch/${pageType}/${id}`,
    },
    {
      id: 'advanced',
      testSubj: 'esItemDetailAdvancedLink',
      label: i18n.translate('xpack.monitoring.esItemNavigation.advancedLinkText', {
        defaultMessage: 'Advanced',
      }),
      route: `/elasticsearch/${pageType}/${id}/advanced`,
    },
  ];

  return <PageTemplate {...rest} tabs={tabs} product="elasticsearch" />;
};
