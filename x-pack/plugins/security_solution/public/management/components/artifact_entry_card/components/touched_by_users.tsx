/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { CommonProps, EuiAvatar, EuiBadge, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import styled from 'styled-components';
import { CREATED_BY, LAST_UPDATED_BY } from './translations';
import { TextValueDisplay } from './text_value_display';
import { useTestIdGenerator } from '../../hooks/use_test_id_generator';

const StyledEuiFlexItem = styled(EuiFlexItem)`
  margin: 6px;
`;

export interface TouchedByUsersProps extends Pick<CommonProps, 'data-test-subj'> {
  createdBy: string;
  updatedBy: string;
}

export const TouchedByUsers = memo<TouchedByUsersProps>(
  ({ createdBy, updatedBy, 'data-test-subj': dataTestSubj }) => {
    const getTestId = useTestIdGenerator(dataTestSubj);

    return (
      <EuiFlexGroup
        alignItems="center"
        gutterSize="l"
        responsive={false}
        data-test-subj={dataTestSubj}
      >
        <EuiFlexItem grow={false}>
          <UserName label={CREATED_BY} value={createdBy} data-test-subj={getTestId('createdBy')} />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <UserName
            label={LAST_UPDATED_BY}
            value={updatedBy}
            data-test-subj={getTestId('updatedBy')}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
);
TouchedByUsers.displayName = 'TouchedByUsers';

interface UserNameProps extends Pick<CommonProps, 'data-test-subj'> {
  label: string;
  value: string;
}

const UserName = memo<UserNameProps>(({ label, value, 'data-test-subj': dataTestSubj }) => {
  const getTestId = useTestIdGenerator(dataTestSubj);

  return (
    <EuiFlexGroup
      alignItems="center"
      gutterSize="m"
      wrap={false}
      responsive={false}
      data-test-subj={dataTestSubj}
    >
      <StyledEuiFlexItem grow={false}>
        <EuiBadge data-test-subj={getTestId('label')}>{label}</EuiBadge>
      </StyledEuiFlexItem>
      <StyledEuiFlexItem grow={false}>
        <EuiFlexGroup responsive={false} gutterSize="s" alignItems="center" wrap={false}>
          <EuiFlexItem grow={false}>
            <EuiAvatar name={value} size="s" data-test-subj={getTestId('avatar')} />
          </EuiFlexItem>
          <EuiFlexItem
            grow={false}
            className="eui-textTruncate"
            data-test-subj={getTestId('value')}
          >
            <TextValueDisplay>{value}</TextValueDisplay>
          </EuiFlexItem>
        </EuiFlexGroup>
      </StyledEuiFlexItem>
    </EuiFlexGroup>
  );
});
UserName.displayName = 'UserName';
