/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiText,
  EuiLink,
  EuiSpacer,
  EuiPanel,
  EuiFlexItem,
  EuiFlexGroup,
  EuiButtonEmpty,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { CodeEditorField } from '@kbn/code-editor';
import React from 'react';
import { docLinks } from '../../../../common/doc_links';
const READ_ONLY_BOILERPLATE = `{
  "read-only-role": {
    "cluster": [],
    "indices": [
      {
        "names": ["*"],
        "privileges": ["read"]
      }
    ]
  }
}`;
const WRITE_ONLY_BOILERPLATE = `{
  "write-only-role": {
    "cluster": [],
    "indices": [
      {
        "names": ["*"],
        "privileges": ["write"]
      }
    ]
  }
}`;
interface SecurityPrivilegesFormProps {
  onChangeRoleDescriptors: (roleDescriptors: string) => void;
  error?: React.ReactNode | React.ReactNode[];
  roleDescriptors: string;
}

export const SecurityPrivilegesForm: React.FC<SecurityPrivilegesFormProps> = ({
  onChangeRoleDescriptors,
  error,
  roleDescriptors,
}) => {
  return (
    <div data-test-subj="create-api-role-descriptors-code-editor-container">
      <EuiLink
        data-test-subj="serverlessSearchSecurityPrivilegesFormLearnHowToStructureRoleDescriptorsLink"
        href={docLinks.roleDescriptors}
        target="_blank"
      >
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
      <EuiPanel hasShadow={false} color="subdued">
        <EuiFlexGroup gutterSize="none" justifyContent="flexEnd" alignItems="baseline">
          <EuiFlexItem grow={false}>
            <EuiText size="xs">
              <h4>
                {i18n.translate('xpack.serverlessSearch.apiKey.privileges.boilerplate.label', {
                  defaultMessage: 'Replace with boilerplate:',
                })}
              </h4>
            </EuiText>
          </EuiFlexItem>

          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              data-test-subj="serverlessSearchSecurityPrivilegesFormReadOnlyButton"
              onClick={() => onChangeRoleDescriptors(READ_ONLY_BOILERPLATE)}
            >
              {i18n.translate(
                'xpack.serverlessSearch.apiKey.privileges.boilerplate.readOnlyLabel',
                {
                  defaultMessage: 'Read-only',
                }
              )}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              data-test-subj="serverlessSearchSecurityPrivilegesFormWriteOnlyButton"
              onClick={() => onChangeRoleDescriptors(WRITE_ONLY_BOILERPLATE)}
            >
              {i18n.translate(
                'xpack.serverlessSearch.apiKey.privileges.boilerplate.writeOnlyLabel',
                {
                  defaultMessage: 'Write-only',
                }
              )}
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
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
