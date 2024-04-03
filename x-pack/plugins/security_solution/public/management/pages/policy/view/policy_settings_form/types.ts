/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PolicyConfig } from '../../../../../../common/endpoint/types';

export interface PolicyFormComponentCommonProps {
  policy: PolicyConfig;
  onChange: (options: { isValid: boolean; updatedPolicy: PolicyConfig }) => void;
  mode: 'edit' | 'view';
  'data-test-subj'?: string;
}
