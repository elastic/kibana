/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { useValues } from 'kea';

import { i18n } from '@kbn/i18n';
import { EuiPageHeader, EuiTitle, EuiSpacer } from '@elastic/eui';

import { EngineOverviewLogic } from './';

import { UnavailablePrompt, TotalStats, TotalCharts, RecentApiLogs } from './components';

export const EngineOverviewMetrics: React.FC = () => {
  const { apiLogsUnavailable } = useValues(EngineOverviewLogic);

  return (
    <>
      <EuiPageHeader>
        <EuiTitle size="l">
          <h1>
            {i18n.translate('xpack.enterpriseSearch.appSearch.engine.overview.heading', {
              defaultMessage: 'Engine overview',
            })}
          </h1>
        </EuiTitle>
      </EuiPageHeader>
      {apiLogsUnavailable ? (
        <UnavailablePrompt />
      ) : (
        <>
          <TotalStats />
          <EuiSpacer size="xl" />
          <TotalCharts />
          <EuiSpacer size="xl" />
          <RecentApiLogs />
        </>
      )}
    </>
  );
};
