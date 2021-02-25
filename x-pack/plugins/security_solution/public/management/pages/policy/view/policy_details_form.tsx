/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonEmpty, EuiSpacer, EuiText } from '@elastic/eui';
import React, { memo, useCallback, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { MalwareProtections } from './policy_forms/protections/malware';
import { LinuxEvents, MacEvents, WindowsEvents } from './policy_forms/events';
import { AdvancedPolicyForms } from './policy_advanced';
import { AntivirusRegistrationForm } from './components/antivirus_registration_form';
import { Ransomware } from './policy_forms/protections/ransomware';
import { LockedPolicyCard } from './policy_forms/locked_card';
import { useLicense } from '../../../../common/hooks/use_license';

export const PolicyDetailsForm = memo(() => {
  const [showAdvancedPolicy, setShowAdvancedPolicy] = useState<boolean>(false);
  const handleAdvancedPolicyClick = useCallback(() => {
    setShowAdvancedPolicy(!showAdvancedPolicy);
  }, [showAdvancedPolicy]);
  const isPlatinumPlus = useLicense().isPlatinumPlus();

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
      <EuiSpacer size="m" />
      {isPlatinumPlus ? <Ransomware /> : <LockedPolicyCard />}
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
      <EuiSpacer size="m" />
      <MacEvents />
      <EuiSpacer size="m" />
      <LinuxEvents />
      <EuiSpacer size="m" />
      <AntivirusRegistrationForm />

      <EuiSpacer size="m" />
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
