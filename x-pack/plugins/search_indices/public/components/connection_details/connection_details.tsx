/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import {
  EuiButtonIcon,
  EuiCodeBlock,
  EuiCopy,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { FormattedMessage } from '@kbn/i18n-react';

interface ConnectionDetailsProps {
  elasticsearchUrl: string;
}

export const ConnectionDetails: React.FC<ConnectionDetailsProps> = ({ elasticsearchUrl }) => {
  const { euiTheme } = useEuiTheme();
  return (
    <EuiFlexGroup gutterSize="s" alignItems="center">
      <EuiFlexItem grow={false}>
        <EuiTitle size="xxxs">
          <h1>
            <FormattedMessage
              id="xpack.searchIndices.connectionDetails.endpointTitle"
              defaultMessage="Endpoint"
            />
          </h1>
        </EuiTitle>
      </EuiFlexItem>
      <EuiFlexItem grow={true}>
        <EuiCodeBlock paddingSize="s" language="http">
          <p css={{ color: euiTheme.colors.successText }}>{elasticsearchUrl}</p>
        </EuiCodeBlock>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiCopy
          textToCopy={elasticsearchUrl}
          afterMessage={i18n.translate('xpack.searchIndices.connectionDetails.copyMessage', {
            defaultMessage: 'Copied',
          })}
        >
          {(copy) => (
            <EuiButtonIcon
              onClick={copy}
              iconType="copy"
              aria-label={i18n.translate('xpack.searchIndices.connectionDetails.copyMessage', {
                defaultMessage: 'Copy Elasticsearch URL to clipboard',
              })}
            />
          )}
        </EuiCopy>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
