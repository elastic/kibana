/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge } from '@elastic/eui';

interface Props {
  type: 'passed' | 'failed';
}

export const CSPEvaluationBadge = ({ type }: Props) => (
  <EuiBadge color={type === 'passed' ? 'success' : type === 'failed' ? 'danger' : 'default'}>
    {type.toUpperCase()}
  </EuiBadge>
);
