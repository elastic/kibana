/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { memo } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiButton, EuiEmptyPrompt } from '@elastic/eui';
import { useCapabilities, useLink } from '../../../../../hooks';

export const NoPackageConfigs = memo<{ configId: string }>(({ configId }) => {
  const { getHref } = useLink();
  const hasWriteCapabilities = useCapabilities().write;

  return (
    <EuiEmptyPrompt
      iconType="plusInCircle"
      title={
        <h3>
          <FormattedMessage
            id="xpack.ingestManager.configDetailsPackageConfigs.createFirstTitle"
            defaultMessage="Add your first integration"
          />
        </h3>
      }
      body={
        <FormattedMessage
          id="xpack.ingestManager.configDetailsPackageConfigs.createFirstMessage"
          defaultMessage="This configuration does not have any integrations yet."
        />
      }
      actions={
        <EuiButton
          isDisabled={!hasWriteCapabilities}
          fill
          href={getHref('add_integration_from_configuration', { configId })}
        >
          <FormattedMessage
            id="xpack.ingestManager.configDetailsPackageConfigs.createFirstButtonText"
            defaultMessage="Add integration"
          />
        </EuiButton>
      }
    />
  );
});
