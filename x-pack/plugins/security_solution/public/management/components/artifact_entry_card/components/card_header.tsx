/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { CommonProps, EuiFlexGroup, EuiFlexItem, EuiTitle } from '@elastic/eui';
import styled from 'styled-components';
import { DateFieldValue } from './date_field_value';
import { useTestIdGenerator } from '../../hooks/use_test_id_generator';
import { CardActionsFlexItem, CardActionsFlexItemProps } from './card_actions_flex_item';

export interface CardHeaderProps
  extends CardActionsFlexItemProps,
    Pick<CommonProps, 'data-test-subj'> {
  name: string;
  createdDate: string;
  updatedDate: string;
}

const StyledEuiFlexItemSmallBottomMargin = styled(EuiFlexItem)`
  margin-bottom: 4px !important;
`;

export const CardHeader = memo<CardHeaderProps>(
  ({ name, createdDate, updatedDate, actions, 'data-test-subj': dataTestSubj }) => {
    const getTestId = useTestIdGenerator(dataTestSubj);

    return (
      <EuiFlexGroup responsive={false} alignItems="flexStart" data-test-subj={dataTestSubj}>
        <StyledEuiFlexItemSmallBottomMargin grow={true}>
          <EuiFlexGroup alignItems="flexStart">
            <EuiFlexItem grow={true}>
              <EuiTitle size="s">
                <h3 data-test-subj={getTestId('title')}>{name}</h3>
              </EuiTitle>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiFlexGroup responsive={false} gutterSize="xl">
                <EuiFlexItem grow={false}>
                  <DateFieldValue
                    date={updatedDate}
                    type="update"
                    data-test-subj={getTestId('updated')}
                  />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <DateFieldValue
                    date={createdDate}
                    type="create"
                    data-test-subj={getTestId('created')}
                  />
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
          </EuiFlexGroup>
        </StyledEuiFlexItemSmallBottomMargin>
        <CardActionsFlexItem actions={actions} data-test-subj={getTestId('actions')} />
      </EuiFlexGroup>
    );
  }
);

CardHeader.displayName = 'CardHeader';
