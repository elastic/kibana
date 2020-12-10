/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

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
        Documentation
      </EuiButtonEmpty>
    </EuiFlexItem>
    <EuiFlexItem grow={false}>
      {applicationPortalUrl && (
        <EuiButtonEmpty flush="left" iconType="popout" href={applicationPortalUrl} target="_blank">
          {applicationLinkTitle || `${name} Application Portal`}
        </EuiButtonEmpty>
      )}
    </EuiFlexItem>
  </EuiFlexGroup>
);
