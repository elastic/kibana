/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiButton, EuiEmptyPrompt } from '@elastic/eui';
import { useCapabilities, useLink } from '../../../../../hooks';

export const NoPackagePolicies = memo<{ policyId: string }>(({ policyId }) => {
  const { getHref } = useLink();
  const hasWriteCapabilities = useCapabilities().write;

  return (
    <EuiEmptyPrompt
      iconType="plusInCircle"
      title={
        <h3>
          <FormattedMessage
            id="xpack.fleet.policyDetailsPackagePolicies.createFirstTitle"
            defaultMessage="Add your first integration"
          />
        </h3>
      }
      body={
        <FormattedMessage
          id="xpack.fleet.policyDetailsPackagePolicies.createFirstMessage"
          defaultMessage="This policy does not have any integrations yet."
        />
      }
      actions={
        <EuiButton
          isDisabled={!hasWriteCapabilities}
          fill
          href={getHref('add_integration_from_policy', { policyId })}
        >
          <FormattedMessage
            id="xpack.fleet.policyDetailsPackagePolicies.createFirstButtonText"
            defaultMessage="Add integration"
          />
        </EuiButton>
      }
    />
  );
});
