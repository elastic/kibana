/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge, type EuiBadgeProps } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

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
    {type === 'failed' ? (
      <FormattedMessage id="xpack.csp.cspEvaluationBadge.failedLabel" defaultMessage="FAILED" />
    ) : (
      <FormattedMessage id="xpack.csp.cspEvaluationBadge.passedLabel" defaultMessage="PASSED" />
    )}
  </EuiBadge>
);
