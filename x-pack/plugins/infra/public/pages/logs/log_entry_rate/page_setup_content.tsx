/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState, useCallback } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiText, EuiButton, EuiSpacer } from '@elastic/eui';

import {
  LogAnalysisSetupPage,
  LogAnalysisSetupPageContent,
  LogAnalysisSetupPageHeader,
} from '../../../components/logging/log_analysis_setup';
import { useTrackPageview } from '../../../../../observability/public';
import { LogEntryRateSetupFlyout } from './setup_flyout';

export const LogEntryRateSetupContent: React.FunctionComponent = () => {
  useTrackPageview({ app: 'infra_logs', path: 'log_entry_rate_setup' });
  useTrackPageview({ app: 'infra_logs', path: 'log_entry_rate_setup', delay: 15000 });

  const [isFlyoutOpen, setIsFlyoutOpen] = useState<boolean>(true);
  const openFlyout = useCallback(() => setIsFlyoutOpen(true), []);
  const closeFlyout = useCallback(() => setIsFlyoutOpen(false), []);

  return (
    <>
      <LogEntryRateSetupFlyout isOpen={isFlyoutOpen} onClose={closeFlyout} />
      <LogAnalysisSetupPage>
        <LogAnalysisSetupPageHeader>
          <FormattedMessage
            id="xpack.infra.logs.logEntryRate.setupTitle"
            defaultMessage="Setup log anomaly analysis"
          />
        </LogAnalysisSetupPageHeader>
        <LogAnalysisSetupPageContent>
          <EuiText size="s">
            <p>
              <FormattedMessage
                id="xpack.infra.logs.logEntryRate.setupDescription"
                defaultMessage="To show log anomalies, machine learning jobs need to be set up"
              />
            </p>
          </EuiText>
          <EuiSpacer />
          <EuiButton fill onClick={openFlyout}>
            <FormattedMessage
              id="xpack.infra.logs.logEntryRate.setupCta"
              defaultMessage="ML Setup"
            />
          </EuiButton>
        </LogAnalysisSetupPageContent>
      </LogAnalysisSetupPage>
    </>
  );
};
