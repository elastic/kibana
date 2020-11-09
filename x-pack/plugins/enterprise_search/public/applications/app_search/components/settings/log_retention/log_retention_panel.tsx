/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect } from 'react';

import { EuiLink, EuiSpacer, EuiSwitch, EuiText, EuiTextColor, EuiTitle } from '@elastic/eui';
import { useActions, useValues } from 'kea';

import { LogRetentionLogic } from './log_retention_logic';
import { AnalyticsLogRetentionMessage, ApiLogRetentionMessage } from './messaging';
import { ELogRetentionOptions } from './types';

export const LogRetentionPanel: React.FC = () => {
  const { toggleLogRetention, fetchLogRetention } = useActions(LogRetentionLogic);

  const { logRetention, isLogRetentionUpdating } = useValues(LogRetentionLogic);

  const hasILM = logRetention !== null;
  const analyticsLogRetentionSettings = logRetention?.[ELogRetentionOptions.Analytics];
  const apiLogRetentionSettings = logRetention?.[ELogRetentionOptions.API];

  useEffect(() => {
    fetchLogRetention();
  }, []);

  return (
    <div data-test-subj="LogRetentionPanel">
      <EuiTitle size="s">
        <h3>Log Retention</h3>
      </EuiTitle>
      <EuiText>
        <p>
          Manage the default write settings for API Logs and Analytics.{' '}
          <EuiLink
            href="https://www.elastic.co/guide/en/app-search/current/logs.html"
            target="_blank"
          >
            Learn more about retention settings.
          </EuiLink>
        </p>
      </EuiText>
      <EuiSpacer size="m" />
      <EuiText>
        <EuiSwitch
          label={
            <>
              <strong>Analytics Logs</strong>{' '}
              {hasILM && (
                <EuiTextColor color="subdued">
                  <AnalyticsLogRetentionMessage />
                </EuiTextColor>
              )}
            </>
          }
          checked={!!analyticsLogRetentionSettings?.enabled}
          onChange={() => toggleLogRetention(ELogRetentionOptions.Analytics)}
          disabled={isLogRetentionUpdating}
          data-test-subj="LogRetentionPanelAnalyticsSwitch"
        />
      </EuiText>
      <EuiSpacer size="m" />
      <EuiText>
        <EuiSwitch
          label={
            <>
              <strong>API Logs</strong>{' '}
              {logRetention !== null && (
                <EuiTextColor color="subdued">
                  <ApiLogRetentionMessage />
                </EuiTextColor>
              )}
            </>
          }
          checked={!!apiLogRetentionSettings?.enabled}
          onChange={() => toggleLogRetention(ELogRetentionOptions.API)}
          disabled={isLogRetentionUpdating}
          data-test-subj="LogRetentionPanelAPISwitch"
        />
      </EuiText>
    </div>
  );
};
