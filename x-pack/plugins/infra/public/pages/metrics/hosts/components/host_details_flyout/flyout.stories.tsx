/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @kbn/telemetry/event_generating_elements_should_be_instrumented */

import { EuiButton, EuiCard } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import type { Meta, Story } from '@storybook/react/types-6-0';
import React from 'react';
import { decorateWithGlobalStorybookThemeProviders } from '../../../../../test_utils/use_global_storybook_theme';
import { DecorateWithKibanaContext } from './flyout.story_decorators';

import { Flyout, type FlyoutProps } from './flyout';

export default {
  title: 'infra/Host Details View/Flyout',
  decorators: [
    (wrappedStory) => <EuiCard title="Host Details Flyout">{wrappedStory()}</EuiCard>,
    (wrappedStory) => <I18nProvider>{wrappedStory()}</I18nProvider>,
    decorateWithGlobalStorybookThemeProviders,
    DecorateWithKibanaContext,
  ],
  component: Flyout,
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
    closeFlyout: () => {},
    onTabClick: () => {},
    renderedTabsSet: { current: new Set(['metadata']) },
    currentTimeRange: {
      interval: '1s',
      from: 1683630468,
      to: 1683630469,
    },
    hostFlyoutOpen: {
      clickedItemId: 'host1-macos',
      selectedTabId: 'metadata',
      searchFilter: '',
      metadataSearch: '',
    },
  },
} as Meta;

const Template: Story<FlyoutProps> = (args) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const closeFlyout = () => setIsOpen(false);
  return (
    <div>
      <EuiButton onClick={() => setIsOpen(true)}>Open flyout</EuiButton>
      {isOpen && <Flyout {...args} closeFlyout={closeFlyout} />}
    </div>
  );
};

export const DefaultFlyoutMetadata = Template.bind({});
DefaultFlyoutMetadata.args = {};

export const FlyoutWithProcesses = Template.bind({});
FlyoutWithProcesses.args = {
  renderedTabsSet: { current: new Set(['processes']) },
  currentTimeRange: {
    interval: '1s',
    from: 1683630468,
    to: 1683630469,
  },
  hostFlyoutOpen: {
    clickedItemId: 'host1-macos',
    selectedTabId: 'processes',
    searchFilter: '',
    metadataSearch: '',
  },
};
