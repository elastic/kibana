/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiAvatar } from '@elastic/eui';
import React from 'react';
import type { ExternalReferenceAttachmentType } from '@kbn/cases-plugin/public/client/attachment_framework/types';
import { lazy } from 'react';
import type { ServicesWrapperProps } from '../services_wrapper';
import OsqueryLogo from '../../components/osquery_icon/osquery.svg';

const AttachmentContentLazy = lazy(() => import('./external_references_content'));

// TODO waiting for Metadata to add "add to timeline" in here
// const AttachmentActions: React.FC = () => (
//   <EuiButtonIcon
//     data-test-subj="test-attachment-action"
//     onClick={() => {}}
//     iconType="arrowRight"
//     aria-label="See attachment"
//   />
// );

export interface IExternalReferenceMetaDataProps {
  actionId: string;
  agentIds: string[];
  queryId: string;
}

export const getExternalReferenceAttachmentRegular = (
  services: ServicesWrapperProps['services']
): ExternalReferenceAttachmentType => ({
  id: 'osquery',
  displayName: 'Osquery',
  getAttachmentViewObject: () => ({
    type: 'regular',
    event: 'attached Osquery results',
    timelineAvatar: <EuiAvatar name="osquery" color="subdued" iconType={OsqueryLogo} />,
    // actions: <AttachmentActions />,
    // @ts-expect-error update types
    children: (props) => (
      <AttachmentContentLazy
        {...props}
        externalReferenceMetadata={
          props.externalReferenceMetadata as unknown as IExternalReferenceMetaDataProps
        }
        services={services}
      />
    ),
  }),
});
