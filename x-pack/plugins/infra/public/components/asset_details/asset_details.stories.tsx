/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiCard } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import type { Meta, Story } from '@storybook/react/types-6-0';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { DecorateWithKibanaContext } from './asset_details.story_decorators';
import type { AssetDetailsProps } from './types';
import { AssetDetails } from './asset_details';
import { decorateWithGlobalStorybookThemeProviders } from '../../test_utils/use_global_storybook_theme';
import { FlyoutTabIds } from './types';

export default {
  title: 'infra/Asset Details View/Asset Details Embeddable',
  decorators: [
    (wrappedStory) => <EuiCard title="Asset Details">{wrappedStory()}</EuiCard>,
    (wrappedStory) => <I18nProvider>{wrappedStory()}</I18nProvider>,
    decorateWithGlobalStorybookThemeProviders,
    DecorateWithKibanaContext,
  ],
  component: AssetDetails,
  args: {
    node: {
      name: 'host1',
      id: 'host1-macOS',
      title: {
        name: 'host1',
        cloudProvider: null,
      },
      os: 'macOS',
      ip: '192.168.0.1',
      rx: 123179.18222222221,
      tx: 123030.54555555557,
      memory: 0.9044444444444445,
      cpu: 0.3979674157303371,
      diskLatency: 0.15291777273162221,
      memoryTotal: 34359738368,
    },
    nodeType: 'host',
    currentTimeRange: {
      interval: '1s',
      from: 1683630468,
      to: 1683630469,
    },
    selectedTabId: 'metadata',
    tabs: [
      {
        id: FlyoutTabIds.METADATA,
        name: i18n.translate('xpack.infra.metrics.nodeDetails.tabs.metadata', {
          defaultMessage: 'Metadata',
        }),
        'data-test-subj': 'hostsView-flyout-tabs-metadata',
      },
      {
        id: FlyoutTabIds.PROCESSES,
        name: i18n.translate('xpack.infra.metrics.nodeDetails.tabs.processes', {
          defaultMessage: 'Processes',
        }),
        'data-test-subj': 'hostsView-flyout-tabs-processes',
      },
    ],
    links: ['apmServices', 'uptime'],
  } as AssetDetailsProps,
} as Meta;

const Template: Story<AssetDetailsProps> = (args) => {
  return <AssetDetails {...args} />;
};

const FlyoutTemplate: Story<AssetDetailsProps> = (args) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const closeFlyout = () => setIsOpen(false);
  return (
    <div>
      <EuiButton
        data-test-subj="infraFlyoutTemplateOpenFlyoutButton"
        onClick={() => setIsOpen(true)}
      >
        Open flyout
      </EuiButton>
      <div hidden={!isOpen}>
        {isOpen && <AssetDetails {...args} renderMode={{ showInFlyout: true, closeFlyout }} />}
      </div>
    </div>
  );
};

export const DefaultAssetDetailsWithMetadataTabSelected = Template.bind({});
DefaultAssetDetailsWithMetadataTabSelected.args = {
  overrides: {
    metadata: {
      showActionsColumn: true,
    },
  },
};

export const AssetDetailsWithMetadataTabSelectedWithPersistedSearch = Template.bind({});
AssetDetailsWithMetadataTabSelectedWithPersistedSearch.args = {
  overrides: {
    metadata: {
      showActionsColumn: true,
      query: 'ip',
    },
  },
  activeTabId: 'metadata',
  onTabsStateChange: () => {},
};

export const AssetDetailsWithMetadataWithoutActions = Template.bind({});
AssetDetailsWithMetadataWithoutActions.args = {};

export const AssetDetailsWithMetadataWithoutLinks = Template.bind({});
AssetDetailsWithMetadataWithoutLinks.args = { links: [] };

export const AssetDetailsAsFlyout = FlyoutTemplate.bind({});
AssetDetailsAsFlyout.args = {
  renderMode: {
    showInFlyout: true,
    closeFlyout: () => {},
  },
};

export const AssetDetailsWithProcessesTabSelected = Template.bind({});
AssetDetailsWithProcessesTabSelected.args = {
  activeTabId: 'processes',
  currentTimeRange: {
    interval: '1s',
    from: 1683630468,
    to: 1683630469,
  },
};

export const AssetDetailsWithMetadataTabOnly = Template.bind({});
AssetDetailsWithMetadataTabOnly.args = {
  tabs: [
    {
      id: FlyoutTabIds.METADATA,
      name: i18n.translate('xpack.infra.metrics.nodeDetails.tabs.metadata', {
        defaultMessage: 'Metadata',
      }),
      'data-test-subj': 'hostsView-flyout-tabs-metadata',
    },
  ],
};
