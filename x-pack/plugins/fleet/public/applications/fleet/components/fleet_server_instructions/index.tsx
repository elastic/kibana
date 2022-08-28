/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiButtonGroup,
  EuiFlexGroup,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiLink,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

import styled from 'styled-components';

import { useStartServices } from '../../hooks';

import { QuickStartTab } from './quick_start_tab';
import { AdvancedTab } from './advanced_tab';

const ContentWrapper = styled(EuiFlexGroup)`
  height: 100%;
  margin: 0 auto;
`;

interface Props {
  onClose: () => void;
}

const useFleetServerTabs = () => {
  const [currentTab, setCurrentTab] = useState('quickStart');

  const quickStartTab = {
    id: 'quickStart',
    label: 'Quick Start',
    content: <QuickStartTab />,
    'data-test-subj': 'fleetServerFlyoutTab-quickStart',
  };

  const advancedTab = {
    id: 'advanced',
    label: 'Advanced',
    content: <AdvancedTab />,
    'data-test-subj': 'fleetServerFlyoutTab-advanced',
  };

  const currentTabContent =
    currentTab === 'quickStart' ? quickStartTab.content : advancedTab.content;

  return { tabs: [quickStartTab, advancedTab], currentTab, setCurrentTab, currentTabContent };
};

const Header: React.FunctionComponent<{
  isFlyout?: boolean;
  currentTab: string;
  tabs: Array<{ id: string; label: string; content: React.ReactNode }>;
  onTabClick: (id: string) => void;
}> = ({ isFlyout = false, currentTab: currentTabId, tabs, onTabClick }) => {
  const { docLinks } = useStartServices();

  return (
    <>
      <EuiTitle size="m">
        <h2 data-test-subj="addFleetServerHeader">
          <FormattedMessage
            id="xpack.fleet.fleetServerFlyout.title"
            defaultMessage="Add a Fleet Server"
          />
        </h2>
      </EuiTitle>

      <EuiSpacer size="m" />

      <EuiText>
        <FormattedMessage
          id="xpack.fleet.fleetServerFlyout.instructions"
          defaultMessage="A Fleet Server is required before you can enroll agents with Fleet. Follow the instructions below to set up a Fleet Server. For more information, see the {userGuideLink}"
          values={{
            userGuideLink: (
              <EuiLink
                href={docLinks.links.fleet.fleetServerAddFleetServer}
                external
                target="_blank"
              >
                <FormattedMessage
                  id="xpack.fleet.fleetServerSetup.setupGuideLink"
                  defaultMessage="Fleet and Elastic Agent Guide"
                />
              </EuiLink>
            ),
          }}
        />
      </EuiText>

      <EuiSpacer size="xl" />

      <EuiButtonGroup
        legend="Fleet Server instructions"
        isFullWidth
        options={tabs}
        idSelected={currentTabId}
        onChange={(id) => onTabClick(id)}
        style={{ maxWidth: '500px' }}
      />
    </>
  );
};

// Renders instructions inside of a flyout
export const FleetServerFlyout: React.FunctionComponent<Props> = ({ onClose }) => {
  const { tabs, currentTab, setCurrentTab, currentTabContent } = useFleetServerTabs();

  return (
    <EuiFlyout data-test-subj="fleetServerFlyout" onClose={onClose} size="m">
      <EuiFlyoutHeader hasBorder aria-labelledby="FleetAddFleetServerFlyoutTitle">
        <Header
          tabs={tabs}
          currentTab={currentTab}
          onTabClick={(id) => setCurrentTab(id)}
          isFlyout
        />
      </EuiFlyoutHeader>

      <EuiFlyoutBody>{currentTabContent}</EuiFlyoutBody>
    </EuiFlyout>
  );
};

// Renders instructions directly
export const FleetServerInstructions: React.FunctionComponent = () => {
  const { tabs, currentTab, setCurrentTab, currentTabContent } = useFleetServerTabs();

  return (
    <ContentWrapper gutterSize="none" justifyContent="center" direction="column">
      <Header tabs={tabs} currentTab={currentTab} onTabClick={(id) => setCurrentTab(id)} />

      <EuiSpacer size="m" />

      {currentTabContent}
    </ContentWrapper>
  );
};
