/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiButton, EuiEmptyPrompt, EuiPageTemplate } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';

export const EmptyState = memo<{
  onAdd: () => void;
  /** Should the Add button be disabled */
  isAddDisabled?: boolean;
}>(({ onAdd, isAddDisabled = false }) => {
  return (
    <EuiPageTemplate template="centeredContent">
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
            defaultMessage="Trusted applications improve performance and alleviate conflicts with other applications running on your hosts. They are applied to hosts running the Endpoint Security integration on their agents."
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
              defaultMessage="Add trusted application"
            />
          </EuiButton>
        }
      />
    </EuiPageTemplate>
  );
});

EmptyState.displayName = 'EmptyState';
