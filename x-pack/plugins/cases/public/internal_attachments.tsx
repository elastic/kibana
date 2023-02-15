/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonIcon } from '@elastic/eui';
import React, { lazy } from 'react';
import type { ExternalReferenceAttachmentTypeRegistry } from './client/attachment_framework/external_reference_registry';
import type { ExternalReferenceAttachmentType } from './client/attachment_framework/types';

const AttachmentContentLazy = lazy(() => import('./external_references_content'));

const AttachmentActions: React.FC = () => {
  return (
    <EuiButtonIcon
      data-test-subj="test-attachment-action"
      onClick={() => {}}
      iconType="arrowRight"
      aria-label="See attachment"
    />
  );
};
AttachmentActions.displayName = 'AttachmentActions';

const getExternalReferenceAttachmentRegular = (): ExternalReferenceAttachmentType => ({
  id: '.files',
  icon: 'filebeatApp',
  displayName: 'Test',
  // eslint-disable-next-line react/display-name
  getAttachmentViewObject: () => ({
    event: 'added file(s)',
    timelineAvatar: 'filebeatApp',
    actions: <AttachmentActions />,
    children: AttachmentContentLazy,
  }),
});

export const registerInternalAttachments = (
  externalRefRegistry: ExternalReferenceAttachmentTypeRegistry
) => {
  externalRefRegistry.register(getExternalReferenceAttachmentRegular());
};
