/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import styled, { css } from 'styled-components';
import { EuiButton, EuiEmptyPrompt } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';

const EmptyPrompt = styled(EuiEmptyPrompt)`
  ${() => css`
    max-width: 100%;
  `}
`;

export const EventFiltersListEmptyState = memo<{
  onAdd: () => void;
  /** Should the Add button be disabled */
  isAddDisabled?: boolean;
}>(({ onAdd, isAddDisabled = false }) => {
  return (
    <EmptyPrompt
      data-test-subj="eventFiltersEmpty"
      iconType="plusInCircle"
      title={
        <h2>
          <FormattedMessage
            id="xpack.securitySolution.eventFilters.listEmpty.title"
            defaultMessage="Add your first event filter"
          />
        </h2>
      }
      body={
        <FormattedMessage
          id="xpack.securitySolution.eventFilters.listEmpty.message"
          defaultMessage="There are currently no event filters on your endpoint."
        />
      }
      actions={
        <EuiButton
          fill
          isDisabled={isAddDisabled}
          onClick={onAdd}
          data-test-subj="eventFiltersListEmptyStateAddButton"
        >
          <FormattedMessage
            id="xpack.securitySolution.eventFilters.listEmpty.addButton"
            defaultMessage="Add event filter"
          />
        </EuiButton>
      }
    />
  );
});

EventFiltersListEmptyState.displayName = 'EventFiltersListEmptyState';
