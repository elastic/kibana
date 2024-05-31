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
import { i18n } from '@kbn/i18n';
import { RouteComponentProps } from 'react-router-dom';

import { resetIndexUrlParams } from './reset_index_url_params';
import { renderBadges } from '../../../../lib/render_badges';
import { Index } from '../../../../../../common';
import {
  INDEX_OPEN,
  IndexDetailsSection,
  IndexDetailsTab,
  IndexDetailsTabId,
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
    name: i18n.translate('xpack.idxMgmt.indexDetails.overviewTitle', {
      defaultMessage: 'Overview',
    }),
    renderTabContent: ({ index }) => <DetailsPageOverview indexDetails={index} />,
    order: 10,
  },
  {
    id: IndexDetailsSection.Mappings,
    name: i18n.translate('xpack.idxMgmt.indexDetails.mappingsTitle', {
      defaultMessage: 'Mappings',
    }),
    renderTabContent: ({ index }) => <DetailsPageMappings index={index} />,
    order: 20,
  },
  {
    id: IndexDetailsSection.Settings,
    name: i18n.translate('xpack.idxMgmt.indexDetails.settingsTitle', {
      defaultMessage: 'Settings',
    }),
    renderTabContent: ({ index }) => <DetailsPageSettings indexName={index.name} />,
    order: 30,
  },
];

const statsTab: IndexDetailsTab = {
  id: IndexDetailsSection.Stats,
  name: i18n.translate('xpack.idxMgmt.indexDetails.statsTitle', {
    defaultMessage: 'Statistics',
  }),
  renderTabContent: ({ index }) => (
    <DetailsPageStats indexName={index.name} isIndexOpen={index.status === INDEX_OPEN} />
  ),
  order: 40,
};

interface Props {
  index: Index;
  tab: IndexDetailsTabId;
  history: RouteComponentProps['history'];
  search: string;
  fetchIndexDetails: () => Promise<void>;
  navigateToIndicesList: () => void;
}
export const DetailsPageContent: FunctionComponent<Props> = ({
  index,
  tab,
  history,
  search,
  fetchIndexDetails,
  navigateToIndicesList,
}) => {
  const {
    config: { enableIndexStats },
    plugins: { console: consolePlugin },
    services: { extensionsService },
  } = useAppContext();

  const tabs = useMemo(() => {
    const sortedTabs = [...defaultTabs];
    if (enableIndexStats) {
      sortedTabs.push(statsTab);
    }
    extensionsService.indexDetailsTabs.forEach((dynamicTab) => {
      if (!dynamicTab.shouldRenderTab || dynamicTab.shouldRenderTab({ index })) {
        sortedTabs.push(dynamicTab);
      }
    });

    sortedTabs.sort((tabA, tabB) => {
      return tabA.order - tabB.order;
    });
    return sortedTabs;
  }, [enableIndexStats, extensionsService.indexDetailsTabs, index]);

  const onSectionChange = useCallback(
    (newSection: IndexDetailsTabId) => {
      return history.push(getIndexDetailsLink(index.name, resetIndexUrlParams(search), newSection));
    },
    [history, index.name, search]
  );

  const headerTabs = useMemo<EuiPageHeaderProps['tabs']>(() => {
    return tabs.map((tabConfig) => ({
      onClick: () => onSectionChange(tabConfig.id),
      isSelected: tabConfig.id === tab,
      key: tabConfig.id,
      'data-test-subj': `indexDetailsTab-${tabConfig.id}`,
      label: tabConfig.name,
    }));
  }, [tabs, tab, onSectionChange]);

  const pageTitle = (
    <>
      {index.name}
      {renderBadges(index, extensionsService)}
    </>
  );

  return (
    <>
      <EuiPageSection paddingSize="none">
        <EuiButton
          data-test-subj="indexDetailsBackToIndicesButton"
          color="text"
          iconType="arrowLeft"
          onClick={navigateToIndicesList}
        >
          <FormattedMessage
            id="xpack.idxMgmt.indexDetails.backToIndicesButtonLabel"
            defaultMessage="Back to indices"
          />
        </EuiButton>
      </EuiPageSection>
      <EuiSpacer size="l" />
      <EuiPageHeader
        data-test-subj="indexDetailsHeader"
        pageTitle={pageTitle}
        bottomBorder
        rightSideItems={[
          <DiscoverLink indexName={index.name} asButton={true} />,
          <ManageIndexButton
            index={index}
            reloadIndexDetails={fetchIndexDetails}
            navigateToIndicesList={navigateToIndicesList}
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
        <DetailsPageTab tabs={tabs} tab={tab} index={index} />
      </div>
      {consolePlugin?.EmbeddableConsole ? <consolePlugin.EmbeddableConsole /> : null}
    </>
  );
};
