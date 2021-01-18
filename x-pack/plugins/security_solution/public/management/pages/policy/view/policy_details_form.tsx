/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButtonEmpty, EuiSpacer, EuiText } from '@elastic/eui';
import React, { memo, useCallback, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { MalwareProtections } from './policy_forms/protections/malware';
import { LinuxEvents, MacEvents, WindowsEvents } from './policy_forms/events';
import { AdvancedPolicyForms } from './policy_advanced';
import { AntivirusRegistrationForm } from './components/antivirus_registration_form';

export const PolicyDetailsForm = memo(() => {
  const [showAdvancedPolicy, setShowAdvancedPolicy] = useState<boolean>(false);
  const handleAdvancedPolicyClick = useCallback(() => {
    setShowAdvancedPolicy(!showAdvancedPolicy);
  }, [showAdvancedPolicy]);

  return (
    <>
      <EuiText size="xs" color="subdued">
        <h4>
          <FormattedMessage
            id="xpack.securitySolution.endpoint.policy.details.protections"
            defaultMessage="Protections"
          />
        </h4>
      </EuiText>

      <EuiSpacer size="xs" />
      <MalwareProtections />
      <EuiSpacer size="l" />

      <EuiText size="xs" color="subdued">
        <h4>
          <FormattedMessage
            id="xpack.securitySolution.endpoint.policy.details.settings"
            defaultMessage="Settings"
          />
        </h4>
      </EuiText>

      <EuiSpacer size="xs" />
      <WindowsEvents />
      <EuiSpacer size="l" />
      <MacEvents />
      <EuiSpacer size="l" />
      <LinuxEvents />
      <EuiSpacer size="l" />
      <AntivirusRegistrationForm />

      <EuiSpacer size="l" />
      <EuiButtonEmpty data-test-subj="advancedPolicyButton" onClick={handleAdvancedPolicyClick}>
        <FormattedMessage
          id="xpack.securitySolution.endpoint.policy.advanced.show"
          defaultMessage="{action} advanced settings"
          values={{ action: showAdvancedPolicy ? 'Hide' : 'Show' }}
        />
      </EuiButtonEmpty>

      <EuiSpacer size="l" />
      {showAdvancedPolicy && <AdvancedPolicyForms />}
    </>
  );
});
PolicyDetailsForm.displayName = 'PolicyDetailsForm';
