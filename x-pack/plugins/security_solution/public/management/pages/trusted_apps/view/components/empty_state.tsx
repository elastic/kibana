/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { memo } from 'react';
import { EuiButton, EuiEmptyPrompt } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';

export const EmptyState = memo<{
  onAdd: () => void;
  /** Should the Add button be disabled */
  isAddDisabled?: boolean;
}>(({ onAdd, isAddDisabled = false }) => {
  return (
    <EuiEmptyPrompt
      data-test-subj="trustedAppEmptyState"
      iconType="plusInCircle"
      title={
        <h2>
          <FormattedMessage
            id="xpack.securitySolution.trustedapps.listEmptyState.title"
            defaultMessage="Add your first trusted application"
          />
        </h2>
      }
      body={
        <FormattedMessage
          id="xpack.securitySolution.trustedapps.listEmptyState.message"
          defaultMessage="There are currently no trusted applications on your endpoint."
        />
      }
      actions={
        <EuiButton
          fill
          isDisabled={isAddDisabled}
          onClick={onAdd}
          data-test-subj="trustedAppsListAddButton"
        >
          <FormattedMessage
            id="xpack.securitySolution.trustedapps.list.addButton"
            defaultMessage="Add Trusted Application"
          />
        </EuiButton>
      }
    />
  );
});

EmptyState.displayName = 'EmptyState';
