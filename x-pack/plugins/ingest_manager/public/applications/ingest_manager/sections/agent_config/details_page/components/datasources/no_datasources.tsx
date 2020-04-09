/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FormattedMessage } from '@kbn/i18n/react';
import { EuiButton, EuiEmptyPrompt } from '@elastic/eui';
import React, { memo } from 'react';
import { useCapabilities } from '../../../../../hooks';
import { useAgentConfigLink } from '../../hooks/use_details_uri';

export const NoDatasources = memo<{ configId: string }>(({ configId }) => {
  const hasWriteCapabilities = useCapabilities().write;
  const addDatasourceLink = useAgentConfigLink('add-datasource', { configId });

  return (
    <EuiEmptyPrompt
      iconType="plusInCircle"
      title={
        <h3>
          <FormattedMessage
            id="xpack.ingestManager.configDetailsDatasources.createFirstTitle"
            defaultMessage="Create your first data source"
          />
        </h3>
      }
      body={
        <FormattedMessage
          id="xpack.ingestManager.configDetailsDatasources.createFirstMessage"
          defaultMessage="This configuration does not have any data sources yet."
        />
      }
      actions={
        <EuiButton isDisabled={!hasWriteCapabilities} fill href={addDatasourceLink}>
          <FormattedMessage
            id="xpack.ingestManager.configDetailsDatasources.createFirstButtonText"
            defaultMessage="Create data source"
          />
        </EuiButton>
      }
    />
  );
});
