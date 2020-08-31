/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiCallOut, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import React, { Fragment } from 'react';
import { ToastInput } from 'src/core/public';
import { toMountPoint } from '../../../../../src/plugins/kibana_react/public';
import { JobSummary, ManagementLinkFn } from '../../common/types';

export const getFailureToast = (
  errorText: string,
  job: JobSummary,
  getManagmenetLink: ManagementLinkFn
): ToastInput => {
  return {
    title: toMountPoint(
      <FormattedMessage
        id="xpack.reporting.publicNotifier.error.couldNotCreateReportTitle"
        defaultMessage="Could not create report for {reportObjectType} '{reportObjectTitle}'."
        values={{ reportObjectType: job.type, reportObjectTitle: job.title }}
      />
    ),
    text: toMountPoint(
      <Fragment>
        <EuiCallOut
          size="m"
          title={i18n.translate('xpack.reporting.publicNotifier.error.calloutTitle', {
            defaultMessage: 'The reporting job failed',
          })}
          color="danger"
          iconType="alert"
        >
          {errorText}
        </EuiCallOut>

        <EuiSpacer />

        <p>
          <FormattedMessage
            id="xpack.reporting.publicNotifier.error.checkManagement"
            defaultMessage="More information is available at {path}."
            values={{
              path: (
                <a href={getManagmenetLink()}>
                  <FormattedMessage
                    id="xpack.reporting.publicNotifier.error.reportingSectionUrlLinkLabel"
                    defaultMessage="Management &gt; Kibana &gt; Reporting"
                  />
                </a>
              ),
            }}
          />
        </p>
      </Fragment>
    ),
    iconType: undefined,
    'data-test-subj': 'completeReportFailure',
  };
};
