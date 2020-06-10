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
import { LogEntryCategoriesSetupFlyout } from './setup_flyout';

export const LogEntryCategoriesSetupContent: React.FunctionComponent = () => {
  useTrackPageview({ app: 'infra_logs', path: 'log_entry_categories_setup' });
  useTrackPageview({ app: 'infra_logs', path: 'log_entry_categories_setup', delay: 15000 });

  const [isFlyoutOpen, setIsFlyoutOpen] = useState<boolean>(true);
  const openFlyout = useCallback(() => setIsFlyoutOpen(true), []);
  const closeFlyout = useCallback(() => setIsFlyoutOpen(false), []);

  return (
    <>
      <LogEntryCategoriesSetupFlyout isOpen={isFlyoutOpen} onClose={closeFlyout} />
      <LogAnalysisSetupPage>
        <LogAnalysisSetupPageHeader>
          <FormattedMessage
            id="xpack.infra.logs.logEntryCategories.setupTitle"
            defaultMessage="FIXME: Placeholder title"
          />
        </LogAnalysisSetupPageHeader>
        <LogAnalysisSetupPageContent>
          <EuiText size="s">
            <p>
              <FormattedMessage
                id="xpack.infra.logs.logEntryCategories.setupDescription"
                defaultMessage="FIXME: Placeholder description"
              />
            </p>
          </EuiText>
          <EuiSpacer />
          <EuiButton fill onClick={openFlyout}>
            <FormattedMessage
              id="xpack.infra.logs.logEntryCategories.setupCta"
              defaultMessage="FIXME: Placeholder CTA"
            />
          </EuiButton>
        </LogAnalysisSetupPageContent>
      </LogAnalysisSetupPage>
    </>
  );
};
