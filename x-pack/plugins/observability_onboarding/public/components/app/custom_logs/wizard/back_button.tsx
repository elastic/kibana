/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonEmpty } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { useHistory } from 'react-router-dom';
import { useWizard } from '.';

export function BackButton({ onBack }: { onBack: () => void }) {
  const { getPath } = useWizard();
  const history = useHistory();

  return (
    <EuiButtonEmpty
      iconType="arrowLeft"
      color="primary"
      onClick={onBack}
      disabled={history.length === 1 || getPath().length === 1}
    >
      {i18n.translate('xpack.observability_onboarding.steps.back', {
        defaultMessage: 'Back',
      })}
    </EuiButtonEmpty>
  );
}
