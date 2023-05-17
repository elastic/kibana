/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { PolicyFormHeader } from './policy_form_header';
import type { PolicyData } from '../../../../../../../common/endpoint/types';

export interface PolicyDetailsFormProps {
  policyDetails: PolicyData;
}

export const PolicyDetailsForm = memo<PolicyDetailsFormProps>((props) => {
  return (
    <div>
      <PolicyFormHeader />
    </div>
  );
});
PolicyDetailsForm.displayName = 'PolicyDetailsForm';
