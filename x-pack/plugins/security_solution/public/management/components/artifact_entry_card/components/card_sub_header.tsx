/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { CommonProps, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { TouchedByUsers, TouchedByUsersProps } from './touched_by_users';
import { EffectScope, EffectScopeProps } from './effect_scope';
import { useTestIdGenerator } from '../../hooks/use_test_id_generator';

export type SubHeaderProps = TouchedByUsersProps &
  EffectScopeProps &
  Pick<CommonProps, 'data-test-subj'> & {
    loadingPoliciesList?: boolean;
  };

export const CardSubHeader = memo<SubHeaderProps>(
  ({
    createdBy,
    updatedBy,
    policies,
    loadingPoliciesList = false,
    'data-test-subj': dataTestSubj,
  }) => {
    const getTestId = useTestIdGenerator(dataTestSubj);

    return (
      <EuiFlexGroup alignItems="center" responsive={true} data-test-subj={dataTestSubj}>
        <EuiFlexItem grow={false}>
          <TouchedByUsers
            createdBy={createdBy}
            updatedBy={updatedBy}
            data-test-subj={getTestId('touchedBy')}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EffectScope
            policies={policies}
            loadingPoliciesList={loadingPoliciesList}
            data-test-subj={getTestId('effectScope')}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
);
CardSubHeader.displayName = 'CardSubHeader';
