/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButton } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

const LOGS_ALERT_DETAILS_FEEDBACK_LINK = 'https://ela.st/log-alert-details-feedback';

export function FeedbackButton() {
  return (
    <EuiButton
      data-test-subj="logsAlertDetailsFeedbackButton"
      href={LOGS_ALERT_DETAILS_FEEDBACK_LINK}
      target="_blank"
      color="warning"
      iconType="editorComment"
    >
      {i18n.translate('xpack.observability.logs.alertDetails.feedbackButtonLabel', {
        defaultMessage: 'Tell us what you think!',
      })}
    </EuiButton>
  );
}
