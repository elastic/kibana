/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiLink,
  EuiSpacer,
  EuiTab,
  EuiTabs,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

import { useStartServices } from '../../hooks';

import { AdvancedTab, QuickStartTab } from './tabs';

export interface Props {
  onClose: () => void;
}

export const FleetServerFlyout: React.FunctionComponent<Props> = ({ onClose }) => {
  const { docLinks } = useStartServices();
  const [currentTab, setCurrentTab] = useState('quickStart');

  const quickStartTab = {
    id: 'quickStart',
    name: 'Quick Start',
    content: <QuickStartTab />,
  };

  const advancedTab = {
    id: 'advanced',
    name: 'Advanced',
    content: <AdvancedTab />,
  };

  const currentTabContent =
    currentTab === 'quickStart' ? quickStartTab.content : advancedTab.content;

  return (
    <EuiFlyout data-test-subj="fleetServerFlyout" onClose={onClose} size="m">
      <EuiFlyoutHeader hasBorder aria-labelledby="FleetAddFleetServerFlyoutTitle">
        <EuiTitle size="m">
          <h2>
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

        <EuiSpacer size="m" />

        <EuiTabs style={{ marginBottom: '-25px' }}>
          {[quickStartTab, advancedTab].map((tab) => (
            <EuiTab
              key={`fleetServerFlyoutTab-${tab.id}`}
              id={tab.id}
              isSelected={tab.id === currentTab}
              onClick={() => setCurrentTab(tab.id)}
            >
              {tab.name}
            </EuiTab>
          ))}
        </EuiTabs>
      </EuiFlyoutHeader>

      <EuiFlyoutBody>{currentTabContent}</EuiFlyoutBody>
    </EuiFlyout>
  );
};
