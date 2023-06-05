/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { EuiButton, EuiFlexGroup, EuiSwitch, type EuiSwitchEvent, EuiFlexItem } from '@elastic/eui';
import type { Meta, Story } from '@storybook/react/types-6-0';
import { i18n } from '@kbn/i18n';
import { useArgs } from '@storybook/addons';
import { DecoratorFn } from '@storybook/react';
import { AssetDetails } from './asset_details';
import { decorateWithGlobalStorybookThemeProviders } from '../../test_utils/use_global_storybook_theme';
import { FlyoutTabIds, type AssetDetailsProps } from './types';
import { DecorateWithKibanaContext } from './__stories__/decorator';

const links: AssetDetailsProps['links'] = ['apmServices', 'uptime'];

const AssetDetailsDecorator: DecoratorFn = (story) => {
  const [_, updateArgs] = useArgs();
  const [checked, setChecked] = React.useState(true);

  useEffect(() => {
    if (checked) {
      updateArgs({ links });
    } else {
      updateArgs({ links: [] });
    }
  }, [updateArgs, checked]);

  const handleChange = (e: EuiSwitchEvent) => {
    setChecked(e.target.checked);
  };

  return (
    <EuiFlexGroup direction="column">
      <EuiFlexItem>
        <EuiSwitch label="With Links" checked={checked} onChange={handleChange} />
      </EuiFlexItem>
      <EuiFlexItem>{story()}</EuiFlexItem>
    </EuiFlexGroup>
  );
};

const stories: Meta<AssetDetailsProps> = {
  title: 'infra/Asset Details View',
  decorators: [
    decorateWithGlobalStorybookThemeProviders,
    DecorateWithKibanaContext,
    AssetDetailsDecorator,
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
    overrides: {
      metadata: {
        showActionsColumn: true,
      },
    },
    nodeType: 'host',
    currentTimeRange: {
      interval: '1s',
      from: 1683630468,
      to: 1683630469,
    },
    activeTabId: 'metadata',
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

    links,
  },
};

const PageTemplate: Story<AssetDetailsProps> = (args) => {
  return <AssetDetails {...args} />;
};

const FlyoutTemplate: Story<AssetDetailsProps> = (args) => {
  const [isOpen, setIsOpen] = useState(false);
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

export const Page = PageTemplate.bind({});

export const Flyout = FlyoutTemplate.bind({});
Flyout.args = {
  renderMode: {
    showInFlyout: true,
    closeFlyout: () => {},
  },
};

export default stories;
