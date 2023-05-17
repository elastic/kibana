/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import type { PolicyData } from '../../../../../../../common/endpoint/types';
import { BehaviorProtection } from '../../policy_forms/protections/behavior';
import { PolicyFormRowLayout } from './policy_form_row_layout';

export interface PolicyFormBehaviourProtectionProps {
  policyDetails: PolicyData;
}

export const PolicyFormBehaviourProtection = memo<PolicyFormBehaviourProtectionProps>((props) => {
  return <PolicyFormRowLayout label={'Malicious Behaviour'} all={<BehaviorProtection />} />;
});
PolicyFormBehaviourProtection.displayName = 'PolicyFormBehaviourProtection';
