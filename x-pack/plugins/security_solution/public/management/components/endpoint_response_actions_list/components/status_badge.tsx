/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { memo } from 'react';
import { EuiBadge, type EuiBadgeProps } from '@elastic/eui';

export const StatusBadge = memo(
  ({
    color,
    status,
    'data-test-subj': dataTestSubj,
  }: {
    color: EuiBadgeProps['color'];
    'data-test-subj'?: string;
    status: string;
  }) => {
    return (
      <EuiBadge data-test-subj={dataTestSubj} color={color} title={undefined}>
        {status}
      </EuiBadge>
    );
  }
);

StatusBadge.displayName = 'StatusBadge';
