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

export const BlocklistEmptyState = memo<{
  onAdd: () => void;
  backComponent?: React.ReactNode;
}>(({ onAdd, backComponent }) => {
  return (
    <ManagementEmptyStateWrapper>
      <EmptyPrompt
        data-test-subj="blocklistEmpty"
        iconType="plusInCircle"
        title={
          <h2>
            <FormattedMessage
              id="xpack.securitySolution.blocklist.listEmpty.title"
              defaultMessage="Add your first blocklist entry"
            />
          </h2>
        }
        body={
          <FormattedMessage
            id="xpack.securitySolution.blocklist.listEmpty.message"
            defaultMessage="Add a blocklist entry to prevent certain executables."
          />
        }
        actions={[
          <EuiButton fill onClick={onAdd} data-test-subj="blocklistEmptyStateAddButton">
            <FormattedMessage
              id="xpack.securitySolution.blocklist.listEmpty.addButton"
              defaultMessage="Add blocklist entry"
            />
          </EuiButton>,

          ...(backComponent ? [backComponent] : []),
        ]}
      />
    </ManagementEmptyStateWrapper>
  );
});

BlocklistEmptyState.displayName = 'BlocklistEmptyState';
