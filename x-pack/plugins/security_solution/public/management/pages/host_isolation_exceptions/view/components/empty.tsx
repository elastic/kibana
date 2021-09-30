/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import styled, { css } from 'styled-components';
import { EuiEmptyPrompt } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';

const EmptyPrompt = styled(EuiEmptyPrompt)`
  ${() => css`
    max-width: 100%;
  `}
`;

export const HostIsolationExceptionsEmptyState = memo<{}>(() => {
  return (
    <EmptyPrompt
      data-test-subj="hostIsolationExceptionsEmpty"
      iconType="plusInCircle"
      title={
        <h2>
          <FormattedMessage
            id="xpack.securitySolution.hostIsolationExceptions.listEmpty.title"
            defaultMessage="Add your first Host Isolation Exception"
          />
        </h2>
      }
      body={
        <FormattedMessage
          id="xpack.securitySolution.hostIsolationExceptions.listEmpty.message"
          defaultMessage="There are currently no host isolation exceptions"
        />
      }
    />
  );
});

HostIsolationExceptionsEmptyState.displayName = 'HostIsolationExceptionsEmptyState';
