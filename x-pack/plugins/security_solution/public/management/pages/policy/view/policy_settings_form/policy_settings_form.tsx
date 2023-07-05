/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiSpacer, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import type { PolicyFormComponentCommonProps } from './types';
import { AdvancedSection } from './components/advanced_section';
import { useTestIdGenerator } from '../../../../hooks/use_test_id_generator';

type PolicySettingsFormProps = PolicyFormComponentCommonProps;

export const PolicySettingsForm = memo<PolicySettingsFormProps>(
  ({ policy, onChange, mode = 'edit', 'data-test-subj': dataTestSubj }) => {
    const getTestId = useTestIdGenerator(dataTestSubj);

    return (
      <div data-test-subj={getTestId()}>
        <EuiText size="xs" color="subdued">
          <h4>
            <FormattedMessage
              id="xpack.securitySolution.endpoint.policy.details.protections"
              defaultMessage="Protections"
            />
          </h4>
        </EuiText>

        <EuiSpacer size="m" />
        <AdvancedSection
          policy={policy}
          onChange={onChange}
          data-test-subj={getTestId('advancedSection')}
          mode={mode}
        />
      </div>
    );
  }
);
PolicySettingsForm.displayName = 'PolicySettingsForm';
