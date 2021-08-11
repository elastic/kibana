/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FunctionComponent } from 'react';

import { i18n } from '@kbn/i18n';
import { EuiText, EuiSpacer, EuiPanel, EuiCallOut } from '@elastic/eui';
import type { EuiStepProps } from '@elastic/eui/src/components/steps/step';

import { useDeprecationLogging } from './use_deprecation_logging';
import { ExternalLinks } from './external_links';
import { DeprecationLoggingToggle } from './deprecation_logging_toggle';

const i18nTexts = {
  observeStepTitle: i18n.translate('xpack.upgradeAssistant.overview.observeStepTitle', {
    defaultMessage: 'Identify deprecated API use and update your applications',
  }),
  toggleTitle: i18n.translate('xpack.upgradeAssistant.overview.toggleTitle', {
    defaultMessage: 'Log Elasticsearch deprecation warnings',
  }),
  analyzeTitle: i18n.translate('xpack.upgradeAssistant.overview.analyzeTitle', {
    defaultMessage: 'Analyze deprecation logs',
  }),
  deprecationWarningTitle: i18n.translate(
    'xpack.upgradeAssistant.overview.deprecationLogs.deprecationWarningTitle',
    {
      defaultMessage: 'Your logs are being written to the logs directory',
    }
  ),
  deprecationWarningBody: i18n.translate(
    'xpack.upgradeAssistant.overview.deprecationLogs.deprecationWarningBody',
    {
      defaultMessage:
        'Go to your logs directory to view the deprecation logs or enable log collecting to see them in the UI.',
    }
  ),
};

const DeprecationLogsPreview: FunctionComponent = () => {
  const state = useDeprecationLogging();
  const canSeeExternalLinks = state.isEnabled && !state.isLoading && !state.fetchError;

  return (
    <>
      <EuiText>
        <h4>{i18nTexts.toggleTitle}</h4>
      </EuiText>
      <EuiSpacer size="m" />
      <EuiPanel>
        <DeprecationLoggingToggle {...state} />
      </EuiPanel>

      {state.hasLoggerDeprecationWarning && (
        <>
          <EuiSpacer size="m" />
          <EuiCallOut title={i18nTexts.deprecationWarningTitle} color="warning" iconType="help">
            <p>{i18nTexts.deprecationWarningBody}</p>
          </EuiCallOut>
        </>
      )}

      {canSeeExternalLinks && (
        <>
          <EuiSpacer size="xl" />
          <EuiText>
            <h4>{i18nTexts.analyzeTitle}</h4>
          </EuiText>
          <EuiSpacer size="m" />
          <ExternalLinks />
        </>
      )}
    </>
  );
};

export const getObserveStep = (): EuiStepProps => {
  return {
    title: i18nTexts.observeStepTitle,
    status: 'incomplete',
    children: <DeprecationLogsPreview />,
  };
};
