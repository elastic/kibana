/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FunctionComponent, useCallback, useMemo } from 'react';
import {
  EuiButton,
  EuiPageHeader,
  EuiPageHeaderProps,
  EuiPageSection,
  EuiSpacer,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { FormattedMessage } from '@kbn/i18n-react';
import { RouteComponentProps } from 'react-router-dom';

import { Index } from '../../../../../../common';
import {
  INDEX_OPEN,
  IndexDetailsSection,
  IndexDetailsTab,
  IndexDetailsTabId,
  Section,
} from '../../../../../../common/constants';
import { getIndexDetailsLink } from '../../../../services/routing';
import { useAppContext } from '../../../../app_context';
import { DiscoverLink } from '../../../../lib/discover_link';
import { ManageIndexButton } from './manage_index_button';
import { DetailsPageOverview } from './details_page_overview';
import { DetailsPageMappings } from './details_page_mappings';
import { DetailsPageSettings } from './details_page_settings';
import { DetailsPageStats } from './details_page_stats';
import { DetailsPageTab } from './details_page_tab';

const defaultTabs: IndexDetailsTab[] = [
  {
    id: IndexDetailsSection.Overview,
    name: (
      <FormattedMessage id="xpack.idxMgmt.indexDetails.overviewTitle" defaultMessage="Overview" />
    ),
    renderTabContent: ({ indexName, index }) => <DetailsPageOverview indexDetails={index} />,
    order: 10,
  },
  {
    id: IndexDetailsSection.Mappings,
    name: (
      <FormattedMessage id="xpack.idxMgmt.indexDetails.mappingsTitle" defaultMessage="Mappings" />
    ),
    renderTabContent: ({ indexName, index }) => <DetailsPageMappings indexName={indexName} />,
    order: 20,
  },
  {
    id: IndexDetailsSection.Settings,
    name: (
      <FormattedMessage id="xpack.idxMgmt.indexDetails.settingsTitle" defaultMessage="Settings" />
    ),
    renderTabContent: ({ indexName, index }) => (
      <DetailsPageSettings indexName={indexName} isIndexOpen={index.status === INDEX_OPEN} />
    ),
    order: 30,
  },
];

const statsTab: IndexDetailsTab = {
  id: IndexDetailsSection.Stats,
  name: <FormattedMessage id="xpack.idxMgmt.indexDetails.statsTitle" defaultMessage="Statistics" />,
  renderTabContent: ({ indexName, index }) => (
    <DetailsPageStats indexName={indexName} isIndexOpen={index.status === INDEX_OPEN} />
  ),
  order: 40,
};

interface Props {
  indexName: string;
  index: Index;
  tab: IndexDetailsTabId;
  history: RouteComponentProps['history'];
  fetchIndexDetails: () => Promise<void>;
}
export const DetailsPageContent: FunctionComponent<Props> = ({
  indexName,
  index,
  tab,
  history,
  fetchIndexDetails,
}) => {
  const {
    config: { enableIndexStats },
    services: { extensionsService },
  } = useAppContext();

  const tabs = useMemo(() => {
    const sortedTabs = [...defaultTabs];
    if (enableIndexStats) {
      sortedTabs.push(statsTab);
    }
    extensionsService.indexDetailsTabs.forEach((dynamicTab) => {
      if (dynamicTab.shouldRenderTab && dynamicTab.shouldRenderTab({ index, indexName })) {
        sortedTabs.push(dynamicTab);
      }
    });

    sortedTabs.sort((tabA, tabB) => {
      return tabA.order - tabB.order;
    });
    return sortedTabs;
  }, [enableIndexStats, extensionsService.indexDetailsTabs, index, indexName]);

  const onSectionChange = useCallback(
    (newSection: IndexDetailsTabId) => {
      return history.push(getIndexDetailsLink(indexName, newSection));
    },
    [history, indexName]
  );

  const navigateToAllIndices = useCallback(() => {
    history.push(`/${Section.Indices}`);
  }, [history]);

  const headerTabs = useMemo<EuiPageHeaderProps['tabs']>(() => {
    return tabs.map((tabConfig) => ({
      onClick: () => onSectionChange(tabConfig.id),
      isSelected: tabConfig.id === tab,
      key: tabConfig.id,
      'data-test-subj': `indexDetailsTab-${tabConfig.id}`,
      label: tabConfig.name,
    }));
  }, [tabs, tab, onSectionChange]);

  return (
    <>
      {' '}
      <EuiPageSection paddingSize="none">
        <EuiButton
          data-test-subj="indexDetailsBackToIndicesButton"
          color="text"
          iconType="arrowLeft"
          onClick={navigateToAllIndices}
        >
          <FormattedMessage
            id="xpack.idxMgmt.indexDetails.backToIndicesButtonLabel"
            defaultMessage="Back to all indices"
          />
        </EuiButton>
      </EuiPageSection>
      <EuiSpacer size="l" />
      <EuiPageHeader
        data-test-subj="indexDetailsHeader"
        pageTitle={indexName}
        bottomBorder
        rightSideItems={[
          <DiscoverLink indexName={indexName} asButton={true} />,
          <ManageIndexButton
            indexName={indexName}
            indexDetails={index}
            reloadIndexDetails={fetchIndexDetails}
            navigateToAllIndices={navigateToAllIndices}
          />,
        ]}
        rightSideGroupProps={{
          wrap: false,
        }}
        responsive="reverse"
        tabs={headerTabs}
      />
      <EuiSpacer size="l" />
      <div
        data-test-subj={`indexDetailsContent`}
        css={css`
          height: 100%;
        `}
      >
        <DetailsPageTab tabs={tabs} tab={tab} indexName={indexName} index={index} />
      </div>
    </>
  );
};
