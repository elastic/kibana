/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import type { PolicyData } from '../../../../../../../common/endpoint/types';
import { AttackSurfaceReductionForm } from '../../components/attack_surface_reduction_form';
import { PolicyFormRowLayout } from './policy_form_row_layout';

export interface PolicyFormAttackSurfaceReductionProps {
  policyDetails: PolicyData;
}

export const PolicyFormAttackSurfaceReduction = memo<PolicyFormAttackSurfaceReductionProps>(
  (props) => {
    return (
      <PolicyFormRowLayout
        label={'Attack surface reduction'}
        windows={<AttackSurfaceReductionForm />}
      />
    );
  }
);
PolicyFormAttackSurfaceReduction.displayName = 'PolicyFormAttackSurfaceReduction';
