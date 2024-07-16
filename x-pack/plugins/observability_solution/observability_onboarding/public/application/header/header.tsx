/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';

import { EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiText, EuiTitle } from '@elastic/eui';
import React from 'react';

export const Header = () => {
  return (
    <EuiFlexGroup>
      <EuiFlexItem>
        <EuiTitle size="l" data-test-subj="obltOnboardingHomeTitle">
          <h1>
            {i18n.translate(
              'xpack.observability_onboarding.experimentalOnboardingFlow.addObservabilityDataTitleLabel',
              { defaultMessage: 'Add Observability data' }
            )}
          </h1>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiText color="subdued">
          {i18n.translate(
            'xpack.observability_onboarding.experimentalOnboardingFlow.startIngestingDataIntoTextLabel',
            {
              defaultMessage:
                'Start ingesting Observability data into Elastic. Return to this page at any time by clicking Add data.',
            }
          )}
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem />
    </EuiFlexGroup>
  );
};
