/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import {
  EuiButtonIcon,
  EuiCopy,
  EuiFlexGroup,
  EuiFlexItem,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { FormattedMessage } from '@kbn/i18n-react';
import { useElasticsearchUrl } from '../../hooks/use_elasticsearch_url';

export const ConnectionDetails: React.FC = () => {
  const { euiTheme } = useEuiTheme();
  const elasticsearchUrl = useElasticsearchUrl();

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
      <EuiFlexItem css={{ whiteSpace: 'nowrap', overflow: 'hidden' }}>
        <p
          data-test-subj="connectionDetailsEndpoint"
          css={{
            color: euiTheme.colors.successText,
            padding: `${euiTheme.size.s} ${euiTheme.size.m}`,
            backgroundColor: euiTheme.colors.lightestShade,
            textOverflow: 'ellipsis',
            overflow: 'hidden',
          }}
        >
          {elasticsearchUrl}
        </p>
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
