/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiText, EuiButton, EuiSpacer } from '@elastic/eui';

import {
  LogAnalysisSetupPage,
  LogAnalysisSetupPageContent,
  LogAnalysisSetupPageHeader,
} from '../../../components/logging/log_analysis_setup';
import { useTrackPageview } from '../../../../../observability/public';

interface LogEntryRateSetupContentProps {
  onOpenSetup: () => void;
}

export const LogEntryRateSetupContent: React.FunctionComponent<LogEntryRateSetupContentProps> = ({
  onOpenSetup,
}) => {
  useTrackPageview({ app: 'infra_logs', path: 'log_entry_rate_setup' });
  useTrackPageview({ app: 'infra_logs', path: 'log_entry_rate_setup', delay: 15000 });

  return (
    <LogAnalysisSetupPage data-test-subj="logEntryRateSetupPage">
      <LogAnalysisSetupPageHeader>
        <FormattedMessage
          id="xpack.infra.logs.logEntryRate.setupTitle"
          defaultMessage="Set up log anomaly analysis"
        />
      </LogAnalysisSetupPageHeader>
      <LogAnalysisSetupPageContent>
        <EuiText size="s">
          <p>
            <FormattedMessage
              id="xpack.infra.logs.logEntryRate.setupDescription"
              defaultMessage="To enable log anomalies, set up a machine learning job"
            />
          </p>
        </EuiText>
        <EuiSpacer />
        <EuiButton fill onClick={onOpenSetup}>
          <FormattedMessage
            id="xpack.infra.logs.logEntryRate.showAnalysisSetupButtonLabel"
            defaultMessage="ML Setup"
          />
        </EuiButton>
      </LogAnalysisSetupPageContent>
    </LogAnalysisSetupPage>
  );
};
