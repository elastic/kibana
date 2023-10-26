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

interface SecurityPrivilegesFormProps {
  roleDescriptors: string;
  onChangeRoleDescriptors: (roleDescriptors: string) => void;
  error?: React.ReactNode | React.ReactNode[];
}

export const SecurityPrivilegesForm: React.FC<SecurityPrivilegesFormProps> = ({
  roleDescriptors,
  onChangeRoleDescriptors,
  error,
}) => {
  return (
    <div data-test-subj="create-api-role-descriptors-code-editor-container">
      <EuiLink href={docLinks.roleDescriptors} target="_blank">
        {i18n.translate('xpack.serverlessSearch.apiKey.roleDescriptorsLinkLabel', {
          defaultMessage: 'Learn how to structure role descriptors',
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
        onChange={(e) => onChangeRoleDescriptors(e)}
        value={roleDescriptors}
      />
    </div>
  );
};
