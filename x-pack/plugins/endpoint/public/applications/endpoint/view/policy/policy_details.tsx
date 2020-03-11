/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { usePageId } from '../use_page_id';
import { usePolicyDetailsSelector } from './policy_hooks';
import { selectPolicyDetails } from '../../store/policy_list/selectors';

export const PolicyDetails = React.memo(() => {
  usePageId('policyDetailsPage');
  const policyItem = usePolicyDetailsSelector(selectPolicyDetails);
  return <div>{policyItem.name}</div>;
});
