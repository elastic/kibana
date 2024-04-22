/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonEmpty } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';

export function BackButton({ onBack }: { onBack: () => void }) {
  return (
    <EuiButtonEmpty
      data-test-subj="observabilityOnboardingBackButtonBackButton"
      iconType="arrowLeft"
      color="primary"
      onClick={onBack}
    >
      {i18n.translate('xpack.observability_onboarding.steps.back', {
        defaultMessage: 'Back',
      })}
    </EuiButtonEmpty>
  );
}
