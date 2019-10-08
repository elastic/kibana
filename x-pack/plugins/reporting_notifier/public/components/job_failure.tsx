/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { ToastInput } from '../../../../../src/core/public';
import { JobSummary, ManagementLinkFn } from '../../index.d';

export const getFailureToast = (
  errorText: string,
  job: JobSummary,
  getManagmenetLink: ManagementLinkFn
): ToastInput => {
  return {
    title: (
      <FormattedMessage
        id="xpack.reportingNotifier.error.couldNotCreateReportTitle"
        defaultMessage="Couldn't create report for {reportObjectType} '{reportObjectTitle}'"
        values={{ reportObjectType: job.type, reportObjectTitle: job.title }}
      />
    ),
    text: (
      <Fragment>
        <p>
          <FormattedMessage
            id="xpack.reportingNotifier.error.failedWithMessage"
            defaultMessage="The reporting job failed with the message: '{errorText}'"
            values={{ errorText }}
          />
        </p>
        <p>
          <FormattedMessage
            id="xpack.reportingNotifier.error.checkManagement"
            defaultMessage="More information is available at {path}."
            values={{
              path: (
                <a href={getManagmenetLink()}>
                  <FormattedMessage
                    id="xpack.reportingNotifier.error.reportingSectionUrlLinkLabel"
                    defaultMessage="Management &gt; Kibana &gt; Reporting"
                  />
                </a>
              ),
            }}
          />
        </p>
      </Fragment>
    ),
    'data-test-subj': 'completeReportFailure',
  };
};
