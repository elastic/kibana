/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiFlyout, EuiFlyoutBody, EuiFlyoutHeader, EuiText, EuiTitle } from '@elastic/eui';

import { useSelectedDocument } from './document_context';

export const DocumentFlyout: React.FC = () => {
  const { selectedDocument, setSelectedDocument } = useSelectedDocument();

  if (selectedDocument === null) return null;

  return (
    <EuiFlyout onClose={() => setSelectedDocument(null)}>
      <EuiFlyoutHeader>
        <EuiTitle size="m">
          <h2>Document</h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiText>
          <code>{JSON.stringify(selectedDocument, null, 2)}</code>
        </EuiText>
      </EuiFlyoutBody>
    </EuiFlyout>
  );
};
