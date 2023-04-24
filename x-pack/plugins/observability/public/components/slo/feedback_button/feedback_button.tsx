/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';

const SLO_FEEDBACK_LINK = 'https://ela.st/slo-feedback';

export function FeedbackButton() {
  return (
    <EuiButton
      data-test-subj="sloFeedbackButton"
      href={SLO_FEEDBACK_LINK}
      target="_blank"
      color="warning"
      iconType="editorComment"
    >
      {i18n.translate('xpack.observability.slo.feedbackButtonLabel', {
        defaultMessage: 'Tell us what you think!',
      })}
    </EuiButton>
  );
}
