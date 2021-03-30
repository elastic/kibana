/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiPageHeader, EuiTitle, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

import { FlashMessages } from '../../../shared/flash_messages';
import { SetAppSearchChrome as SetPageChrome } from '../../../shared/kibana_chrome';
import { BreadcrumbTrail } from '../../../shared/kibana_chrome/generate_breadcrumbs';

import { LogRetentionCallout, LogRetentionTooltip, LogRetentionOptions } from '../log_retention';

import { API_LOGS_TITLE, RECENT_API_EVENTS } from './constants';

interface Props {
  engineBreadcrumb: BreadcrumbTrail;
}
export const ApiLogs: React.FC<Props> = ({ engineBreadcrumb }) => {
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
