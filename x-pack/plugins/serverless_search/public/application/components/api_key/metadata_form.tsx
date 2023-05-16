/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBadge,
  EuiTitle,
  EuiFlexItem,
  EuiFlexGroup,
  EuiText,
  EuiLink,
  EuiSpacer,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { CodeEditorField } from '@kbn/kibana-react-plugin/public';
import React from 'react';
import { docLinks } from '../../../../common/doc_links';
import { OPTIONAL_LABEL } from '../../../../common/i18n_string';

interface MetadataFormProps {
  metadata: string;
  onChangeMetadata: (metadata: string) => void;
  error?: React.ReactNode | React.ReactNode[];
}

export const MetadataForm: React.FC<MetadataFormProps> = ({
  metadata,
  onChangeMetadata,
  error,
}) => {
  return (
    <>
      <EuiFlexGroup alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiTitle size="xs">
            <h3>
              {i18n.translate('xpack.serverlessSearch.apiKey.metadataTitle', {
                defaultMessage: 'Add Metadata',
              })}
            </h3>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiBadge>{OPTIONAL_LABEL}</EuiBadge>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer />
      <EuiText>
        {i18n.translate('xpack.serverlessSearch.apiKey.metadataDescription', {
          defaultMessage:
            'Use configurable key-value pairs to add information about the API key or customize Elasticsearch resource access.',
        })}
      </EuiText>
      <EuiSpacer />
      <EuiLink href={docLinks.metadata} target="_blank">
        {i18n.translate('xpack.serverlessSearch.apiKey.metadataLinkLabel', {
          defaultMessage: 'Learn how to structure role metadata',
        })}
      </EuiLink>
      <EuiSpacer />
      {error && (
        <EuiText size="s" color="danger">
          <p>{error}</p>
        </EuiText>
      )}
      <CodeEditorField
        allowFullScreen
        fullWidth
        height="600px"
        languageId="json"
        isCopyable
        onChange={(e) => onChangeMetadata(e)}
        value={metadata}
      />
    </>
  );
};
