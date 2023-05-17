/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { PolicyFormSectionTitle } from './policy_form_section_title';
import { AntivirusRegistrationForm } from '../../components/antivirus_registration_form';
import { PolicyFormRowLayout } from './policy_form_row_layout';
import type { PolicyData } from '../../../../../../../common/endpoint/types';

export interface PolicyFormAntivirusRegistrationProps {
  policyDetails: PolicyData;
}

export const PolicyFormAntivirusRegistration = memo<PolicyFormAntivirusRegistrationProps>(
  (props) => {
    return (
      <PolicyFormRowLayout
        label={<PolicyFormSectionTitle title={'Register as antivirus'} />}
        windows={<AntivirusRegistrationForm />}
      />
    );
  }
);
PolicyFormAntivirusRegistration.displayName = 'PolicyFormAntivirusRegistration';
