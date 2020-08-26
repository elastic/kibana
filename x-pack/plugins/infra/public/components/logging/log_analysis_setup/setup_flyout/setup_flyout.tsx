/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiTitle,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import React from 'react';
import { LogEntryRateSetupView } from './log_entry_rate_setup_view';
import { LogEntryCategoriesSetupView } from './log_entry_categories_setup_view';
import { LogAnalysisModuleList } from './module_list';
import { useLogAnalysisSetupFlyoutStateContext } from './setup_flyout_state';

const FLYOUT_HEADING_ID = 'logAnalysisSetupFlyoutHeading';

export const LogAnalysisSetupFlyout: React.FC = () => {
  const {
    closeFlyout,
    flyoutView,
    showModuleList,
    showModuleSetup,
  } = useLogAnalysisSetupFlyoutStateContext();

  if (flyoutView.view === 'hidden') {
    return null;
  }

  return (
    <EuiFlyout aria-labelledby={FLYOUT_HEADING_ID} maxWidth={800} onClose={closeFlyout}>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle>
          <h2 id={FLYOUT_HEADING_ID}>
            <FormattedMessage
              id="xpack.infra.logs.analysis.setupFlyoutTitle"
              defaultMessage="Anomaly detection with Machine Learning"
            />
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        {flyoutView.view === 'moduleList' ? (
          <LogAnalysisModuleList onViewModuleSetup={showModuleSetup} />
        ) : flyoutView.view === 'moduleSetup' && flyoutView.module === 'logs_ui_analysis' ? (
          <LogAnalysisSetupFlyoutSubPage onViewModuleList={showModuleList}>
            <LogEntryRateSetupView onClose={closeFlyout} />
          </LogAnalysisSetupFlyoutSubPage>
        ) : flyoutView.view === 'moduleSetup' && flyoutView.module === 'logs_ui_categories' ? (
          <LogAnalysisSetupFlyoutSubPage onViewModuleList={showModuleList}>
            <LogEntryCategoriesSetupView onClose={closeFlyout} />
          </LogAnalysisSetupFlyoutSubPage>
        ) : null}
      </EuiFlyoutBody>
    </EuiFlyout>
  );
};

const LogAnalysisSetupFlyoutSubPage: React.FC<{
  onViewModuleList: () => void;
}> = ({ children, onViewModuleList }) => (
  <EuiFlexGroup alignItems="flexStart" direction="column" gutterSize="none">
    <EuiFlexItem grow={false}>
      <EuiButtonEmpty flush="left" iconSide="left" iconType="arrowLeft" onClick={onViewModuleList}>
        <FormattedMessage
          id="xpack.infra.logs.analysis.setupFlyoutGotoListButtonLabel"
          defaultMessage="All Machine Learning jobs"
        />
      </EuiButtonEmpty>
    </EuiFlexItem>
    <EuiFlexItem>{children}</EuiFlexItem>
  </EuiFlexGroup>
);
