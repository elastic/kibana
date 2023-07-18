/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiButton } from '@elastic/eui';
import type { Meta, Story } from '@storybook/react/types-6-0';
import { i18n } from '@kbn/i18n';
import type { DataViewField } from '@kbn/data-views-plugin/public';
import type { DataView } from '@kbn/data-views-plugin/public';
import { AssetDetails } from './asset_details';
import { decorateWithGlobalStorybookThemeProviders } from '../../test_utils/use_global_storybook_theme';
import { FlyoutTabIds, Tab, type AssetDetailsProps } from './types';
import { DecorateWithKibanaContext } from './__stories__/decorator';

const links: AssetDetailsProps['links'] = ['alertRule', 'nodeDetails', 'apmServices'];
const tabs: Tab[] = [
  {
    id: FlyoutTabIds.OVERVIEW,
    name: i18n.translate('xpack.infra.nodeDetails.tabs.overview.title', {
      defaultMessage: 'Overview',
    }),
    'data-test-subj': 'hostsView-flyout-tabs-overview',
  },
  {
    id: FlyoutTabIds.LOGS,
    name: i18n.translate('xpack.infra.nodeDetails.tabs.logs', {
      defaultMessage: 'Logs',
    }),
    'data-test-subj': 'hostsView-flyout-tabs-logs',
  },
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
  {
    id: FlyoutTabIds.ANOMALIES,
    name: i18n.translate('xpack.infra.nodeDetails.tabs.anomalies', {
      defaultMessage: 'Anomalies',
    }),
    'data-test-subj': 'hostsView-flyout-tabs-anomalies',
  },
  {
    id: FlyoutTabIds.LINK_TO_APM,
    name: i18n.translate('xpack.infra.infra.nodeDetails.apmTabLabel', {
      defaultMessage: 'APM',
    }),
    'data-test-subj': 'hostsView-flyout-apm-link',
  },
];

const stories: Meta<AssetDetailsProps> = {
  title: 'infra/Asset Details View',
  decorators: [decorateWithGlobalStorybookThemeProviders, DecorateWithKibanaContext],
  component: AssetDetails,
  argTypes: {
    links: {
      options: links,
      control: {
        type: 'inline-check',
      },
    },
  },
  args: {
    node: {
      name: 'host1',
      id: 'host1-macOS',
      ip: '192.168.0.1',
    },
    overrides: {
      overview: {
        metricsDataView: {
          id: 'default',
          getFieldByName: () => 'hostname' as unknown as DataViewField,
        } as unknown as DataView,
        logsDataView: {
          id: 'default',
          getFieldByName: () => 'hostname' as unknown as DataViewField,
        } as unknown as DataView,
      },
      metadata: {
        showActionsColumn: true,
      },
    },
    nodeType: 'host',
    dateRange: {
      from: '2023-04-09T11:07:49Z',
      to: '2023-04-09T11:23:49Z',
    },
    tabs,
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
