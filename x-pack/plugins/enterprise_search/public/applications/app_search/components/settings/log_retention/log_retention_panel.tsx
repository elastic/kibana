/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect } from 'react';
import { i18n } from '@kbn/i18n';

import { EuiLink, EuiSpacer, EuiSwitch, EuiText, EuiTextColor, EuiTitle } from '@elastic/eui';
import { useActions, useValues } from 'kea';

import { DOCS_PREFIX } from '../../../routes';

import { LogRetentionLogic, LogRetentionOptions, LogRetentionMessage } from '../../log_retention';

export const LogRetentionPanel: React.FC = () => {
  const { toggleLogRetention, fetchLogRetention } = useActions(LogRetentionLogic);

  const { logRetention, isLogRetentionUpdating } = useValues(LogRetentionLogic);

  const hasILM = logRetention !== null;
  const analyticsLogRetentionSettings = logRetention?.[LogRetentionOptions.Analytics];
  const apiLogRetentionSettings = logRetention?.[LogRetentionOptions.API];

  useEffect(() => {
    fetchLogRetention();
  }, []);

  return (
    <div data-test-subj="LogRetentionPanel">
      <EuiTitle size="s">
        <h2>
          {i18n.translate('xpack.enterpriseSearch.appSearch.settings.logRetention.title', {
            defaultMessage: 'Log Retention',
          })}
        </h2>
      </EuiTitle>
      <EuiText>
        <p>
          {i18n.translate('xpack.enterpriseSearch.appSearch.settings.logRetention.description', {
            defaultMessage: 'Manage the default write settings for API Logs and Analytics.',
          })}{' '}
          <EuiLink href={`${DOCS_PREFIX}/logs.html`} target="_blank">
            {i18n.translate('xpack.enterpriseSearch.appSearch.settings.logRetention.learnMore', {
              defaultMessage: 'Learn more about retention settings.',
            })}
          </EuiLink>
        </p>
      </EuiText>
      <EuiSpacer size="m" />
      <EuiText>
        <EuiSwitch
          label={
            <>
              <strong>
                {i18n.translate(
                  'xpack.enterpriseSearch.appSearch.settings.logRetention.analytics.label',
                  {
                    defaultMessage: 'Analytics Logs',
                  }
                )}
              </strong>
              {': '}
              {hasILM && (
                <EuiTextColor color="subdued">
                  <LogRetentionMessage type={LogRetentionOptions.Analytics} />
                </EuiTextColor>
              )}
            </>
          }
          checked={!!analyticsLogRetentionSettings?.enabled}
          onChange={() => toggleLogRetention(LogRetentionOptions.Analytics)}
          disabled={isLogRetentionUpdating}
          data-test-subj="LogRetentionPanelAnalyticsSwitch"
        />
      </EuiText>
      <EuiSpacer size="m" />
      <EuiText>
        <EuiSwitch
          label={
            <>
              <strong>
                {i18n.translate(
                  'xpack.enterpriseSearch.appSearch.settings.logRetention.api.label',
                  {
                    defaultMessage: 'API Logs',
                  }
                )}
              </strong>
              {': '}
              {hasILM && (
                <EuiTextColor color="subdued">
                  <LogRetentionMessage type={LogRetentionOptions.API} />
                </EuiTextColor>
              )}
            </>
          }
          checked={!!apiLogRetentionSettings?.enabled}
          onChange={() => toggleLogRetention(LogRetentionOptions.API)}
          disabled={isLogRetentionUpdating}
          data-test-subj="LogRetentionPanelAPISwitch"
        />
      </EuiText>
    </div>
  );
};
