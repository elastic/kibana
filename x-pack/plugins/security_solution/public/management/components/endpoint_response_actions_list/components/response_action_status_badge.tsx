/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { memo } from 'react';
import { EuiBadge, type EuiBadgeProps } from '@elastic/eui';

export const ResponseActionStatusBadge = memo(
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
      // We've a EuiTooltip that wraps this component,
      // Thus we don't need to add a title tooltip as well.
      <EuiBadge data-test-subj={dataTestSubj} color={color} title="">
        {status}
      </EuiBadge>
    );
  }
);

ResponseActionStatusBadge.displayName = 'ResponseActionStatusBadge';
