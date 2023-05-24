/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ThemeServiceSetup, ToastsSetup } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { toMountPoint } from '@kbn/kibana-react-plugin/public';
import React from 'react';
import { ReportingAPIClient } from '.';

interface Deps {
  apiClient: ReportingAPIClient;
  toasts: ToastsSetup;
  theme: ThemeServiceSetup;
  onClose?: () => void;
}

export const showReportRequestToasts = async (
  objectType: string,
  { apiClient, onClose, theme: { theme$ }, toasts }: Deps
) => {
  try {
    toasts.addSuccess({
      title: i18n.translate(
        'xpack.reporting.panelContent.successfullyQueuedReportNotificationTitle',
        {
          defaultMessage: 'Queued report for {objectType}',
          values: { objectType },
        }
      ),
      text: toMountPoint(
        <FormattedMessage
          id="xpack.reporting.panelContent.successfullyQueuedReportNotificationDescription"
          defaultMessage="Track its progress in {path}."
          values={{
            path: (
              <a href={apiClient.getManagementLink()}>
                <FormattedMessage
                  id="xpack.reporting.publicNotifier.reportLink.reportingSectionUrlLinkLabel"
                  defaultMessage="Stack Management &gt; Reporting"
                />
              </a>
            ),
          }}
        />,
        { theme$ }
      ),
      'data-test-subj': 'queueReportSuccess',
    });

    if (onClose) {
      onClose();
    }
  } catch (error) {
    toasts.addError(error, {
      title: i18n.translate('xpack.reporting.panelContent.notification.reportingErrorTitle', {
        defaultMessage: 'Unable to create report',
      }),
      toastMessage: (
        // eslint-disable-next-line react/no-danger
        <span dangerouslySetInnerHTML={{ __html: error.body.message }} />
      ) as unknown as string,
    });
  }
};
