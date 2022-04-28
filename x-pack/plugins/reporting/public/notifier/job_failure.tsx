/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCallOut, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';
import { DocLinksStart, ThemeServiceStart, ToastInput } from '@kbn/core/public';
import { toMountPoint } from '@kbn/kibana-react-plugin/public';
import type { JobSummary, ManagementLinkFn } from '../../common/types';
import * as errors from '../../common/errors';
import { sharedI18nTexts } from '../shared_i18n_texts';

export const getFailureToast = (
  errorText: string,
  job: JobSummary,
  getManagmenetLink: ManagementLinkFn,
  theme: ThemeServiceStart,
  docLinks: DocLinksStart
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
        <EuiCallOut size="m" color="danger" data-test-errorText={errorText}>
          {job.errorCode === errors.VisualReportingSoftDisabledError.code
            ? sharedI18nTexts.cloud.insufficientMemoryError(
                docLinks.links.reporting.cloudMinimumRequirements
              )
            : errorText}
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
