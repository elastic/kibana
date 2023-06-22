/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';

const OBSERVABILITY_ONBOARDING_FEEDBACK_LINK =
  'https://ela.st/logs-onboarding-feedback';

export function ObservabilityOnboardingHeaderActionMenu() {
  return (
    <EuiButton
      data-test-subj="observabilityOnboardingPageGiveFeedback"
      href={OBSERVABILITY_ONBOARDING_FEEDBACK_LINK}
      size="s"
      target="_blank"
      color="warning"
      iconType="editorComment"
    >
      {i18n.translate('xpack.observability_onboarding.header.feedback', {
        defaultMessage: 'Give feedback',
      })}
    </EuiButton>
  );
}
