/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiButton, EuiCallOut, EuiLink, EuiSpacer } from '@elastic/eui';
import type { Meta, Story } from '@storybook/react/types-6-0';
import { MemoryRouter } from 'react-router-dom';
import { AssetDetails } from './asset_details';
import { decorateWithGlobalStorybookThemeProviders } from '../../test_utils/use_global_storybook_theme';
import { type TabIds, type AssetDetailsProps } from './types';
import { DecorateWithKibanaContext } from './__stories__/decorator';
import { assetDetailsProps } from './__stories__/context/fixtures';

interface AssetDetailsStoryArgs {
  props: AssetDetailsProps;
  tabId: TabIds;
  links: AssetDetailsProps['links'];
}

const stories: Meta<AssetDetailsStoryArgs> = {
  title: 'infra/Asset Details View/Page',
  decorators: [decorateWithGlobalStorybookThemeProviders, DecorateWithKibanaContext],
  component: AssetDetails,
  argTypes: {
    links: {
      options: assetDetailsProps.links,
      control: {
        type: 'inline-check',
      },
    },
  },
  args: {
    props: { ...assetDetailsProps },
    tabId: 'overview',
  },
};

const PageTabTemplate: Story<AssetDetailsStoryArgs> = (args) => {
  return (
    <MemoryRouter initialEntries={[`/infra/metrics/hosts?assetDetails=(tabId:${args.tabId})`]}>
      <AssetDetails {...args.props} />
    </MemoryRouter>
  );
};

const FlyoutTemplate: Story<AssetDetailsStoryArgs> = (args) => {
  const [isOpen, setIsOpen] = useState(false);
  const closeFlyout = () => setIsOpen(false);
  return (
    <div>
      <EuiCallOut
        color="warning"
        title={`To see different tab content before open the Controls and change the tabId or add the tabId to the url`}
      >
        <p>
          for example:{' '}
          <EuiLink
            data-test-subj="infraFlyoutTemplateLink"
            href={`${window.location.origin}?path=/story/infra-asset-details-view-page--flyout&args=tabId:metadata`}
          >{`${window.location.origin}?path=/story/infra-asset-details-view-page--flyout&args=tabId:metadata`}</EuiLink>
        </p>
        <p>
          Supported tab ids: &quot;overview&quot;, &quot;metadata&quot;, &quot;processes&quot;,
          &quot;anomalies&quot;, &quot;logs&quot;.
        </p>
      </EuiCallOut>
      <EuiSpacer />
      <EuiButton
        data-test-subj="infraFlyoutTemplateOpenFlyoutButton"
        onClick={() => setIsOpen(true)}
      >
        Open flyout
      </EuiButton>
      <div hidden={!isOpen}>
        {isOpen && (
          <MemoryRouter
            initialEntries={[`/infra/metrics/hosts?assetDetails=(tabId:${args.tabId})`]}
          >
            <AssetDetails {...args.props} renderMode={{ mode: 'flyout', closeFlyout }} />
          </MemoryRouter>
        )}
      </div>
    </div>
  );
};

export const OverviewTab = PageTabTemplate.bind({});
OverviewTab.args = { tabId: 'overview' };

export const MetadataTab = PageTabTemplate.bind({});
MetadataTab.args = { tabId: 'metadata' };

export const ProcessesTab = PageTabTemplate.bind({});
ProcessesTab.args = { tabId: 'processes' };

export const LogsTab = PageTabTemplate.bind({});
LogsTab.args = { tabId: 'logs' };

export const AnomaliesTab = PageTabTemplate.bind({});
AnomaliesTab.args = { tabId: 'anomalies' };

export const Flyout = FlyoutTemplate.bind({});
Flyout.args = { tabId: 'overview' };

export default stories;
