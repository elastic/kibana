/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBreadcrumb } from '@elastic/eui';
import React, { FunctionComponent, useEffect } from 'react';
import { Index } from '../../../../../../common';
import { IndexDetailsTab, IndexDetailsTabId } from '../../../../../../common/constants';
import { useAppContext } from '../../../../app_context';
import { IndexManagementBreadcrumb, breadcrumbService } from '../../../../services/breadcrumbs';
import { DetailsPageOverview } from './details_page_overview';

interface Props {
  tabs: IndexDetailsTab[];
  tab: IndexDetailsTabId;
  index: Index;
}
export const DetailsPageTab: FunctionComponent<Props> = ({ tabs, tab, index }) => {
  const selectedTab = tabs.find((tabConfig) => tabConfig.id === tab);
  const {
    core: { getUrlForApp },
  } = useAppContext();

  useEffect(() => {
    const breadcrumb: EuiBreadcrumb = selectedTab?.breadcrumb ?? { text: selectedTab?.name };
    breadcrumbService.setBreadcrumbs(IndexManagementBreadcrumb.indexDetails, breadcrumb);
  }, [selectedTab]);

  return selectedTab ? (
    selectedTab.renderTabContent({ index, getUrlForApp })
  ) : (
    <DetailsPageOverview indexDetails={index} />
  );
};
