/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useValues } from 'kea';

import { EuiFlexGroup, EuiFlexItem, EuiPageHeader, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { FlashMessages } from '../../../shared/flash_messages';

import { UnavailablePrompt, TotalStats, TotalCharts, RecentApiLogs } from './components';

import { EngineOverviewLogic } from './';

export const EngineOverviewMetrics: React.FC = () => {
  const { apiLogsUnavailable } = useValues(EngineOverviewLogic);

  return (
    <>
      <EuiPageHeader
        pageTitle={i18n.translate('xpack.enterpriseSearch.appSearch.engine.overview.heading', {
          defaultMessage: 'Engine overview',
        })}
      />
      <FlashMessages />
      {apiLogsUnavailable ? (
        <UnavailablePrompt />
      ) : (
        <>
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
      )}
    </>
  );
};
