/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import type { PolicyData } from '../../../../../../../common/endpoint/types';
import { PolicyFormRowLayout } from './policy_form_row_layout';
import { Ransomware } from '../../policy_forms/protections/ransomware';

export interface PolicyFormRansomwareProps {
  policyDetails: PolicyData;
}

export const PolicyFormRansomware = memo<PolicyFormRansomwareProps>((props) => {
  return <PolicyFormRowLayout label={'Ransomware'} all={<Ransomware />} />;
});
PolicyFormRansomware.displayName = 'PolicyFormRansomware';
