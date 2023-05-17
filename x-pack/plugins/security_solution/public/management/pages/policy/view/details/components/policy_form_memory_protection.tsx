/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { PolicyFormSectionTitle } from './policy_form_section_title';
import type { PolicyData } from '../../../../../../../common/endpoint/types';
import { MemoryProtection } from '../../policy_forms/protections/memory';
import { PolicyFormRowLayout } from './policy_form_row_layout';

export interface PolicyFormMemoryProtectionProps {
  policyDetails: PolicyData;
}

export const PolicyFormMemoryProtection = memo<PolicyFormMemoryProtectionProps>((props) => {
  return (
    <PolicyFormRowLayout
      label={<PolicyFormSectionTitle title={'Memory threat'} />}
      all={<MemoryProtection />}
    />
  );
});
PolicyFormMemoryProtection.displayName = 'PolicyFormMemoryProtection';
