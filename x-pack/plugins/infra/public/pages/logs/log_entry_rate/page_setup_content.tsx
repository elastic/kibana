/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiEmptyPrompt, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import React from 'react';
import { useTrackPageview } from '../../../../../observability/public/hooks/use_track_metric';

interface LogEntryRateSetupContentProps {
  onOpenSetup: () => void;
}

export const LogEntryRateSetupContent: React.FunctionComponent<LogEntryRateSetupContentProps> = ({
  onOpenSetup,
}) => {
  useTrackPageview({ app: 'infra_logs', path: 'log_entry_rate_setup' });
  useTrackPageview({ app: 'infra_logs', path: 'log_entry_rate_setup', delay: 15000 });

  return (
    <EuiEmptyPrompt
      data-test-subj="logEntryRateSetupPage"
      title={
        <h2>
          <FormattedMessage
            id="xpack.infra.logs.logEntryRate.setupTitle"
            defaultMessage="Set up log anomaly analysis"
          />
        </h2>
      }
      body={
        <EuiText size="s">
          <p>
            <FormattedMessage
              id="xpack.infra.logs.logEntryRate.setupDescription"
              defaultMessage="To enable log anomalies, set up a machine learning job"
            />
          </p>
        </EuiText>
      }
      actions={
        <EuiButton fill onClick={onOpenSetup}>
          <FormattedMessage
            id="xpack.infra.logs.logEntryRate.showAnalysisSetupButtonLabel"
            defaultMessage="ML Setup"
          />
        </EuiButton>
      }
    />
  );
};
