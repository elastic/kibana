/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiButton, EuiEmptyPrompt } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';

export const EventFiltersEmptyState = memo<{
  onAdd: () => void;
  /** Should the Add button be disabled */
  isAddDisabled?: boolean;
}>(({ onAdd, isAddDisabled = false }) => {
  return (
    <EuiEmptyPrompt
      data-test-subj="eventFiltersListEmptyState"
      iconType="plusInCircle"
      title={
        <h2>
          <FormattedMessage
            id="xpack.securitySolution.eventFilter.listEmptyState.title"
            defaultMessage="Add your first event filter"
          />
        </h2>
      }
      body={
        <FormattedMessage
          id="xpack.securitySolution.eventFilter.listEmptyState.message"
          defaultMessage="There are currently no event filters on your endpoint."
        />
      }
      actions={
        <EuiButton
          fill
          isDisabled={isAddDisabled}
          onClick={onAdd}
          data-test-subj="eventFilterListAddButton"
        >
          <FormattedMessage
            id="xpack.securitySolution.eventFilter.list.addButton"
            defaultMessage="Add Event Filter"
          />
        </EuiButton>
      }
    />
  );
});

EventFiltersEmptyState.displayName = 'EventFiltersEmptyState';
