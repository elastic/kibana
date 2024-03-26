/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButton } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

const SLO_FEEDBACK_LINK = 'https://ela.st/slo-feedback';

interface Props {
  disabled?: boolean;
}

export function FeedbackButton({ disabled }: Props) {
  return (
    <EuiButton
      data-test-subj="sloFeedbackButton"
      isDisabled={disabled}
      href={SLO_FEEDBACK_LINK}
      target="_blank"
      color="warning"
      iconType="editorComment"
    >
      {i18n.translate('xpack.slo.feedbackButtonLabel', {
        defaultMessage: 'Tell us what you think!',
      })}
    </EuiButton>
  );
}
