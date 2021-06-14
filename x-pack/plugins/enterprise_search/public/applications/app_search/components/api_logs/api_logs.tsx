/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';

import { useValues, useActions } from 'kea';

import {
  EuiPageHeader,
  EuiTitle,
  EuiPageContent,
  EuiPageContentBody,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
} from '@elastic/eui';

import { FlashMessages } from '../../../shared/flash_messages';
import { SetAppSearchChrome as SetPageChrome } from '../../../shared/kibana_chrome';
import { Loading } from '../../../shared/loading';

import { getEngineBreadcrumbs } from '../engine';
import { LogRetentionCallout, LogRetentionTooltip, LogRetentionOptions } from '../log_retention';

import { ApiLogFlyout } from './api_log';
import { ApiLogsTable, NewApiEventsPrompt } from './components';
import { API_LOGS_TITLE, RECENT_API_EVENTS } from './constants';

import { ApiLogsLogic } from './';

export const ApiLogs: React.FC = () => {
  const { dataLoading, apiLogs, meta } = useValues(ApiLogsLogic);
  const { fetchApiLogs, pollForApiLogs } = useActions(ApiLogsLogic);

  useEffect(() => {
    fetchApiLogs();
  }, [meta.page.current]);

  useEffect(() => {
    pollForApiLogs();
  }, []);

  if (dataLoading && !apiLogs.length) return <Loading />;

  return (
    <>
      <SetPageChrome trail={getEngineBreadcrumbs([API_LOGS_TITLE])} />
      <EuiPageHeader pageTitle={API_LOGS_TITLE} />

      <FlashMessages />
      <LogRetentionCallout type={LogRetentionOptions.API} />

      <EuiPageContent hasBorder>
        <EuiPageContentBody>
          <EuiFlexGroup gutterSize="m" alignItems="center" responsive={false} wrap>
            <EuiFlexItem grow={false}>
              <EuiTitle size="s">
                <h2>{RECENT_API_EVENTS}</h2>
              </EuiTitle>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <LogRetentionTooltip type={LogRetentionOptions.API} />
            </EuiFlexItem>
            <EuiFlexItem />
            <EuiFlexItem grow={false}>
              <NewApiEventsPrompt />
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer size="m" />

          <ApiLogsTable hasPagination />
          <ApiLogFlyout />
        </EuiPageContentBody>
      </EuiPageContent>
    </>
  );
};
