/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCallOut, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';
import { ThemeServiceStart, ToastInput } from 'src/core/public';
import { toMountPoint } from '../../../../../src/plugins/kibana_react/public';
import type { JobSummary, ManagementLinkFn } from '../../common/types';

export const getFailureToast = (
  errorText: string,
  job: JobSummary,
  getManagmenetLink: ManagementLinkFn,
  theme: ThemeServiceStart
): ToastInput => {
  return {
    title: toMountPoint(
      <FormattedMessage
        id="xpack.reporting.publicNotifier.error.couldNotCreateReportTitle"
        defaultMessage="Cannot create {reportType} report for '{reportObjectTitle}'."
        values={{ reportType: job.jobtype, reportObjectTitle: job.title }}
      />,
      { theme$: theme.theme$ }
    ),
    text: toMountPoint(
      <>
        <EuiCallOut
          size="m"
          title={i18n.translate('xpack.reporting.publicNotifier.error.calloutTitle', {
            defaultMessage: 'The reporting job failed',
          })}
          color="danger"
          iconType="alert"
          data-test-errorText={errorText}
        >
          {errorText}
        </EuiCallOut>

        <EuiSpacer />

        <p>
          <FormattedMessage
            id="xpack.reporting.publicNotifier.error.checkManagement"
            defaultMessage="Go to {path} for details."
            values={{
              path: (
                <a href={getManagmenetLink()}>
                  <FormattedMessage
                    id="xpack.reporting.publicNotifier.error.reportingSectionUrlLinkLabel"
                    defaultMessage="Stack Management &gt; Kibana &gt; Reporting"
                  />
                </a>
              ),
            }}
          />
        </p>
      </>,
      { theme$: theme.theme$ }
    ),
    iconType: undefined,
    'data-test-subj': 'completeReportFailure',
  };
};
