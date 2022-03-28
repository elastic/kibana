/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge, type EuiBadgeProps } from '@elastic/eui';
import { CSP_EVALUATION_BADGE_FAILED, CSP_EVALUATION_BADGE_PASSED } from './translations';

interface Props {
  type: 'passed' | 'failed';
}

const getColor = (type: Props['type']): EuiBadgeProps['color'] => {
  if (type === 'passed') return 'success';
  if (type === 'failed') return 'danger';
  return 'default';
};

export const CspEvaluationBadge = ({ type }: Props) => (
  <EuiBadge color={getColor(type)}>
    {type === 'failed' ? CSP_EVALUATION_BADGE_FAILED : CSP_EVALUATION_BADGE_PASSED}
  </EuiBadge>
);
