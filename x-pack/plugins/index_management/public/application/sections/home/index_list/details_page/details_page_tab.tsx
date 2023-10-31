/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ApplicationStart } from '@kbn/core-application-browser';
import React, { FunctionComponent } from 'react';
import { DetailsPageOverview } from './details_page_overview';
import { IndexDetailsTab, IndexDetailsTabIds } from '../../../../../../common/constants';
import { Index } from '../../../../../../common';

interface Props {
  tabs: IndexDetailsTab[];
  indexDetailsSection: IndexDetailsTabIds;
  index?: Index | null;
  indexName: string;
  getUrlForApp: ApplicationStart['getUrlForApp'];
}
export const DetailsPageTab: FunctionComponent<Props> = ({
  tabs,
  indexDetailsSection,
  index,
  indexName,
  getUrlForApp,
}) => {
  // if there is no index data, the tab content won't be rendered, so it's safe to return null here
  if (!index) {
    return null;
  }
  const selectedTab = tabs.find((tab) => tab.id === indexDetailsSection);
  return selectedTab ? (
    selectedTab.renderTabContent({ indexName, index, getUrlForApp })
  ) : (
    <DetailsPageOverview indexDetails={index} />
  );
};
