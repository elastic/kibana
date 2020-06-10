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
import { useLogEntryRateModuleContext } from './use_log_entry_rate_module';

export const LogEntryRateSetupContent: React.FunctionComponent = () => {
  useTrackPageview({ app: 'infra_logs', path: 'log_entry_rate_setup' });
  useTrackPageview({ app: 'infra_logs', path: 'log_entry_rate_setup', delay: 15000 });
  const { viewSetupForInitialization } = useLogEntryRateModuleContext();

  return (
    <LogAnalysisSetupPage>
      <LogAnalysisSetupPageHeader>
        <FormattedMessage
          id="xpack.infra.logs.logEntryRate.setupTitle"
          defaultMessage="FIXME: Placeholder title"
        />
      </LogAnalysisSetupPageHeader>
      <LogAnalysisSetupPageContent>
        <EuiText size="s">
          <p>
            <FormattedMessage
              id="xpack.infra.logs.logEntryRate.setupDescription"
              defaultMessage="FIXME: Placeholder description"
            />
          </p>
        </EuiText>
        <EuiSpacer />
        <EuiButton fill onClick={viewSetupForInitialization}>
          <FormattedMessage
            id="xpack.infra.logs.logEntryRate.setupCta"
            defaultMessage="FIXME: Placeholder CTA"
          />
        </EuiButton>
      </LogAnalysisSetupPageContent>
    </LogAnalysisSetupPage>
  );
};
