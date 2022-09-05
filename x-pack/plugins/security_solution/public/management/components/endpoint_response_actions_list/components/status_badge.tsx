/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { memo } from 'react';
import { EuiBadge, type EuiBadgeProps } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { useTestIdGenerator } from '../../../hooks/use_test_id_generator';
import { type UX_MESSAGES } from '../translations';

export const StatusBadge = memo(
  ({
    color,
    status,
  }: {
    color: EuiBadgeProps['color'];
    status: keyof typeof UX_MESSAGES['badge'];
  }) => {
    const getTestId = useTestIdGenerator('response-actions-list');

    return (
      <EuiBadge data-test-subj={getTestId('column-status')} color={color}>
        <FormattedMessage
          id="xpack.securitySolution.responseActionsList.list.item.status"
          defaultMessage="{status}"
          values={{ status }}
        />
      </EuiBadge>
    );
  }
);

StatusBadge.displayName = 'StatusBadge';
