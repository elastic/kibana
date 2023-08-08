/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiSplitPanel, EuiText, EuiTitle, EuiSpacer } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

export interface DocumentLevelSecurityPanelProps {
  toggleSwitch: JSX.Element;
}

export const DocumentLevelSecurityPanel: React.FC<DocumentLevelSecurityPanelProps> = ({
  toggleSwitch,
}) => {
  return (
    <EuiSplitPanel.Outer hasBorder hasShadow={false}>
      <EuiSplitPanel.Inner>
        <EuiTitle>
          <h4>
            {i18n.translate(
              'xpack.enterpriseSearch.connector.documentLevelSecurity.enablePanel.heading',
              { defaultMessage: 'Document Level Security' }
            )}
          </h4>
        </EuiTitle>
        <EuiSpacer />
        <EuiText size="s">
          <p>
            {i18n.translate(
              'xpack.enterpriseSearch.connector.documentLevelSecurity.enablePanel.description',
              {
                defaultMessage:
                  'Enables you to control which documents users can access, based on their permissions. This ensures search results only return relevant, authorized information for users, based on their roles.',
              }
            )}
          </p>
        </EuiText>
      </EuiSplitPanel.Inner>
      <EuiSplitPanel.Inner color="subdued">{toggleSwitch}</EuiSplitPanel.Inner>
    </EuiSplitPanel.Outer>
  );
};
