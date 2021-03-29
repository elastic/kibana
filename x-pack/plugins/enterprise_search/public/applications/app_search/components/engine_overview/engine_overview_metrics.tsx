/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiFlexGroup, EuiFlexItem, EuiPageHeader, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { FlashMessages } from '../../../shared/flash_messages';

import { TotalStats, TotalCharts, RecentApiLogs } from './components';

export const EngineOverviewMetrics: React.FC = () => {
  return (
    <>
      <EuiPageHeader
        pageTitle={i18n.translate('xpack.enterpriseSearch.appSearch.engine.overview.heading', {
          defaultMessage: 'Engine overview',
        })}
      />
      <FlashMessages />

      <EuiFlexGroup>
        <EuiFlexItem grow={1}>
          <TotalStats />
        </EuiFlexItem>
        <EuiFlexItem grow={3}>
          <TotalCharts />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="xl" />
      <RecentApiLogs />
    </>
  );
};
