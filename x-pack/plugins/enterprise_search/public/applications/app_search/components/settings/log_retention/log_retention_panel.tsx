/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';

import { useActions, useValues } from 'kea';

import {
  EuiPanel,
  EuiLink,
  EuiSpacer,
  EuiSwitch,
  EuiText,
  EuiTextColor,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { DOCS_PREFIX } from '../../../routes';

import { LogRetentionLogic, LogRetentionOptions, LogRetentionMessage } from '../../log_retention';

export const LogRetentionPanel: React.FC = () => {
  const { toggleLogRetention, fetchLogRetention } = useActions(LogRetentionLogic);

  const { logRetention, isLogRetentionUpdating } = useValues(LogRetentionLogic);

  const hasILM = logRetention !== null;
  const analyticsLogRetentionSettings = logRetention?.[LogRetentionOptions.Analytics];
  const apiLogRetentionSettings = logRetention?.[LogRetentionOptions.API];
  const crawlerLogRetentionSettings = logRetention?.[LogRetentionOptions.Crawler];

  useEffect(() => {
    fetchLogRetention();
  }, []);

  return (
    <EuiPanel hasBorder data-test-subj="LogRetentionPanel">
      <EuiTitle size="s">
        <h2>
          {i18n.translate('xpack.enterpriseSearch.appSearch.settings.logRetention.title', {
            defaultMessage: 'Log retention',
          })}
        </h2>
      </EuiTitle>
      <EuiSpacer size="m" />
      <EuiText>
        <EuiSwitch
          label={
            <>
              <strong>
                {i18n.translate(
                  'xpack.enterpriseSearch.appSearch.settings.logRetention.analytics.label',
                  {
                    defaultMessage: 'Log analytics events',
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
                    defaultMessage: 'Log API events',
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
      <EuiSpacer size="m" />
      <EuiText>
        <EuiSwitch
          label={
            <>
              <strong>
                {i18n.translate(
                  'xpack.enterpriseSearch.appSearch.settings.logRetention.crawler.label',
                  {
                    defaultMessage: 'Web Crawler Logs',
                  }
                )}
              </strong>
              {': '}
              {hasILM && (
                <EuiTextColor color="subdued">
                  <LogRetentionMessage type={LogRetentionOptions.Crawler} />
                </EuiTextColor>
              )}
            </>
          }
          checked={!!crawlerLogRetentionSettings?.enabled}
          onChange={() => toggleLogRetention(LogRetentionOptions.Crawler)}
          disabled={isLogRetentionUpdating}
          data-test-subj="LogRetentionPanelCrawlerSwitch"
        />
      </EuiText>
      <EuiSpacer size="l" />
      <EuiText size="xs" color="subdued">
        <p>
          {i18n.translate('xpack.enterpriseSearch.appSearch.settings.logRetention.description', {
            defaultMessage: 'Log retention is determined by the ILM policies for your deployment.',
          })}
          <br />
          <EuiLink href={`${DOCS_PREFIX}/logs.html`} target="_blank">
            {i18n.translate('xpack.enterpriseSearch.appSearch.settings.logRetention.learnMore', {
              defaultMessage: 'Learn more about log retention for Enterprise Search.',
            })}
          </EuiLink>
        </p>
      </EuiText>
    </EuiPanel>
  );
};
