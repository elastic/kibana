/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import styled from 'styled-components';
import { PolicyFormEventCollection } from './policy_form_event_collection';
import { PolicyFormAttackSurfaceReduction } from './policy_form_attack_surface_reduction';
import { PolicyFormBehaviourProtection } from './policy_form_behaviour_protection';
import { PolicyFormMemoryProtection } from './policy_form_memory_protection';
import { PolicyFormRansomware } from './policy_form_ransomware';
import { PolicyFormMalware } from './policy_form_malware';
import { PolicyFormHeader } from './policy_form_header';
import type { PolicyData } from '../../../../../../../common/endpoint/types';

const FormContainer = styled.div`
  .policyFormRow + .policyFormRow {
    margin-top: ${({ theme: { eui } }) => eui.euiSizeL};
  }
`;

export interface PolicyDetailsFormProps {
  policyDetails: PolicyData;
}

export const PolicyDetailsForm = memo<PolicyDetailsFormProps>((props) => {
  return (
    <FormContainer>
      <PolicyFormHeader />

      <PolicyFormMalware />

      <PolicyFormRansomware />

      <PolicyFormMemoryProtection />

      <PolicyFormBehaviourProtection />

      <PolicyFormAttackSurfaceReduction />

      <PolicyFormEventCollection />
    </FormContainer>
  );
});
PolicyDetailsForm.displayName = 'PolicyDetailsForm';
