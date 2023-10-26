/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiText, EuiLink, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { CodeEditorField } from '@kbn/kibana-react-plugin/public';
import React from 'react';
import { docLinks } from '../../../../common/doc_links';

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
    <div data-test-subj="create-api-metadata-code-editor-container">
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
    </div>
  );
};
