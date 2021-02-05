/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { i18n } from '@kbn/i18n';

import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

import { DOCUMENTATION_LINK_TITLE } from '../../../../constants';

interface ConfigDocsLinksProps {
  name: string;
  documentationUrl: string;
  applicationPortalUrl?: string;
  applicationLinkTitle?: string;
}

export const ConfigDocsLinks: React.FC<ConfigDocsLinksProps> = ({
  name,
  documentationUrl,
  applicationPortalUrl,
  applicationLinkTitle,
}) => (
  <EuiFlexGroup justifyContent="flexStart" responsive={false}>
    <EuiFlexItem grow={false}>
      <EuiButtonEmpty flush="left" iconType="popout" href={documentationUrl} target="_blank">
        {DOCUMENTATION_LINK_TITLE}
      </EuiButtonEmpty>
    </EuiFlexItem>
    <EuiFlexItem grow={false}>
      {applicationPortalUrl && (
        <EuiButtonEmpty flush="left" iconType="popout" href={applicationPortalUrl} target="_blank">
          {applicationLinkTitle ||
            i18n.translate(
              'xpack.enterpriseSearch.workplaceSearch.contentSource.configDocs.applicationPortal.button',
              {
                defaultMessage: '{name} Application Portal',
                values: { name },
              }
            )}
        </EuiButtonEmpty>
      )}
    </EuiFlexItem>
  </EuiFlexGroup>
);
