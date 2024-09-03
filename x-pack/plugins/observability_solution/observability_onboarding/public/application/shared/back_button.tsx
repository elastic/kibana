/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom-v5-compat';
import { EuiButtonEmpty, EuiSpacer } from '@elastic/eui';

export const BackButton: React.FC<React.PropsWithChildren<{}>> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <>
      <EuiButtonEmpty
        data-test-subj="observabilityOnboardingFlowBackToSelectionButton"
        iconType="arrowLeft"
        flush="left"
        onClick={() => navigate(`../${location.search}`)}
      >
        {children
          ? children
          : i18n.translate(
              'xpack.observability_onboarding.experimentalOnboardingFlow.button.backToSelectionLabel',
              { defaultMessage: 'Back to selection' }
            )}
      </EuiButtonEmpty>
      <EuiSpacer size="m" />
    </>
  );
};
