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

  const [isOpen, setIsOpen] = useState<boolean>(true);
  const openFlyout = useCallback(() => setIsOpen(true), []);
  const closeFlyout = useCallback(() => setIsOpen(false), []);

  return (
    <>
      <LogAnalysisSetupPage>
        <LogAnalysisSetupPageHeader>
          <h3>
            <FormattedMessage
              id="xpack.infra.logs.logEntryRate.setupTitle"
              defaultMessage="FIXME: Placeholder title"
            />
          </h3>
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
          <EuiButton fill onClick={openFlyout}>
            <FormattedMessage
              id="xpack.infra.logs.logEntryRate.setupCta"
              defaultMessage="FIXME: Placeholder CTA"
            />
          </EuiButton>
        </LogAnalysisSetupPageContent>
      </LogAnalysisSetupPage>

      <LogEntryRateSetupFlyout isOpen={isOpen} onClose={closeFlyout} />
    </>
  );
};
