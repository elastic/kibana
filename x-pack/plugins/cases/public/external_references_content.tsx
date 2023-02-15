/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import type { ExternalReferenceAttachmentViewProps } from './client/attachment_framework/types';

const AttachmentContent: React.FC<ExternalReferenceAttachmentViewProps> = ({
  externalReferenceId,
  externalReferenceMetadata,
}) => {
  return (
    <EuiFlexGroup data-test-subj="test-attachment-content">
      {externalReferenceMetadata != null && (
        <>
          <EuiFlexItem>{`File name: ${externalReferenceMetadata.name}`}</EuiFlexItem>
          <EuiFlexItem>{`SO reference id: ${externalReferenceId}`}</EuiFlexItem>
          <br />
        </>
      )}
    </EuiFlexGroup>
  );
};
AttachmentContent.displayName = 'AttachmentContent';

// eslint-disable-next-line import/no-default-export
export { AttachmentContent as default };
