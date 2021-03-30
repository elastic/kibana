/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';

import { useValues, useActions } from 'kea';

import { EuiPageHeader, EuiTitle, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

import { FlashMessages } from '../../../shared/flash_messages';
import { SetAppSearchChrome as SetPageChrome } from '../../../shared/kibana_chrome';
import { BreadcrumbTrail } from '../../../shared/kibana_chrome/generate_breadcrumbs';
import { Loading } from '../../../shared/loading';

import { LogRetentionCallout, LogRetentionTooltip, LogRetentionOptions } from '../log_retention';

import { API_LOGS_TITLE, RECENT_API_EVENTS } from './constants';

import { ApiLogsLogic } from './';

interface Props {
  engineBreadcrumb: BreadcrumbTrail;
}
export const ApiLogs: React.FC<Props> = ({ engineBreadcrumb }) => {
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
      <SetPageChrome trail={[...engineBreadcrumb, API_LOGS_TITLE]} />
      <EuiPageHeader pageTitle={API_LOGS_TITLE} />

      <FlashMessages />
      <LogRetentionCallout type={LogRetentionOptions.API} />

      <EuiFlexGroup gutterSize="m" alignItems="center" responsive={false} wrap>
        <EuiFlexItem grow={false}>
          <EuiTitle size="s">
            <h2>{RECENT_API_EVENTS}</h2>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <LogRetentionTooltip type={LogRetentionOptions.API} />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>{/* TODO: NewApiEventsPrompt */}</EuiFlexItem>
      </EuiFlexGroup>

      {/* TODO: ApiLogsTable */}
    </>
  );
};
