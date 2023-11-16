/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCallOut, EuiSpacer, EuiText } from '@elastic/eui';
import * as React from 'react';
import { SyntheticsJourneyApiResponse } from '../../../../../../common/runtime_types';
import { StdErrorLogs } from '../../common/components/stderr_logs';
import {
  ERROR_RUNNING_TEST,
  FAILED_TO_RUN,
} from '../../test_now_mode/browser/browser_test_results';

export const TestRunErrorInfo = ({
  journeyDetails,
  hasNoSteps,
  showErrorTitle = true,
  showErrorLogs = false,
}: {
  hasNoSteps?: boolean;
  showErrorTitle?: boolean;
  showErrorLogs?: boolean;
  journeyDetails: SyntheticsJourneyApiResponse['details'];
}) => {
  const isDownMonitor = journeyDetails?.journey?.monitor?.status === 'down';

  const errorMessage = journeyDetails?.journey?.error?.message;

  return (
    <>
      {(hasNoSteps || isDownMonitor) && showErrorTitle && (
        <EuiCallOut
          data-test-subj="monitorTestRunErrorCallout"
          title={ERROR_RUNNING_TEST}
          color="danger"
          iconType="warning"
        >
          <EuiText color="danger">{errorMessage ?? FAILED_TO_RUN}</EuiText>
        </EuiCallOut>
      )}
      <EuiSpacer size="m" />
      {(showErrorLogs || hasNoSteps) && (
        <StdErrorLogs
          checkGroup={journeyDetails?.journey?.monitor.check_group}
          hideTitle={false}
          pageSize={10}
        />
      )}
    </>
  );
};
