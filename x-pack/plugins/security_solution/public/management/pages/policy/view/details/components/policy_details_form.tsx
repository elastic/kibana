/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import styled from 'styled-components';
import { EuiSpacer } from '@elastic/eui';
import { PolicyFormAntivirusRegistration } from './policy_form_antivirus_registration';
import { PolicyFormEventCollection } from './policy_form_event_collection';
import { PolicyFormAttackSurfaceReduction } from './policy_form_attack_surface_reduction';
import { PolicyFormBehaviourProtection } from './policy_form_behaviour_protection';
import { PolicyFormMemoryProtection } from './policy_form_memory_protection';
import { PolicyFormRansomware } from './policy_form_ransomware';
import { PolicyFormMalware } from './policy_form_malware';
import { PolicyFormHeader } from './policy_form_header';
import type { MaybeImmutable, PolicyData } from '../../../../../../../common/endpoint/types';
import { PolicyFormAdvancedSettings } from './policy_form_advanced_settings';

const FormContainer = styled.div`
  margin-bottom: calc(${({ theme: { eui } }) => eui.euiSizeXXL} * 2);

  .policyFormRow + .policyFormRow {
    margin-top: ${({ theme: { eui } }) => eui.euiSizeXXL};
  }
`;

export interface PolicyDetailsFormProps {
  policyDetails: MaybeImmutable<PolicyData>;
}

export const PolicyDetailsForm = memo<PolicyDetailsFormProps>(
  ({ policyDetails: _policyDetails }) => {
    const policyDetails = _policyDetails as PolicyData;

    return (
      <FormContainer>
        <PolicyFormHeader />

        <EuiSpacer />

        <PolicyFormMalware policyDetails={policyDetails} />

        <PolicyFormMemoryProtection policyDetails={policyDetails} />

        <PolicyFormBehaviourProtection policyDetails={policyDetails} />

        <PolicyFormRansomware policyDetails={policyDetails} />

        <PolicyFormAttackSurfaceReduction policyDetails={policyDetails} />

        <PolicyFormEventCollection policyDetails={policyDetails} />

        <PolicyFormAntivirusRegistration policyDetails={policyDetails} />

        <EuiSpacer size="xxl" />
        <PolicyFormAdvancedSettings policyDetails={policyDetails} />
      </FormContainer>
    );
  }
);
PolicyDetailsForm.displayName = 'PolicyDetailsForm';
