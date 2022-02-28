/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import styled, { css } from 'styled-components';
import { EuiButton, EuiEmptyPrompt } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { ManagementEmptyStateWrapper } from '../../../../components/management_empty_state_wrapper';

const EmptyPrompt = styled(EuiEmptyPrompt)`
  ${() => css`
    max-width: 100%;
  `}
`;

export const HostIsolationExceptionsEmptyState = memo<{
  onAdd: () => void;
  backComponent?: React.ReactNode;
}>(({ onAdd, backComponent }) => {
  return (
    <ManagementEmptyStateWrapper>
      <EmptyPrompt
        data-test-subj="hostIsolationExceptionsEmpty"
        iconType="plusInCircle"
        title={
          <h2>
            <FormattedMessage
              id="xpack.securitySolution.hostIsolationExceptions.listEmpty.title"
              defaultMessage="Add your first host isolation exception"
            />
          </h2>
        }
        body={
          <FormattedMessage
            id="xpack.securitySolution.hostIsolationExceptions.listEmpty.message"
            defaultMessage="Add a host isolation exception to allow isolated hosts to communicate with specific IPs."
          />
        }
        actions={[
          <EuiButton
            fill
            onClick={onAdd}
            data-test-subj="hostIsolationExceptionsEmptyStateAddButton"
          >
            <FormattedMessage
              id="xpack.securitySolution.hostIsolationExceptions.listEmpty.addButton"
              defaultMessage="Add host isolation exception"
            />
          </EuiButton>,

          ...(backComponent ? [backComponent] : []),
        ]}
      />
    </ManagementEmptyStateWrapper>
  );
});

HostIsolationExceptionsEmptyState.displayName = 'HostIsolationExceptionsEmptyState';
