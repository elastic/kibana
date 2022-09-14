/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

import type { IExternalReferenceMetaDataProps } from './external_reference';
import { PackQueriesAttachmentWrapper } from './pack_queries_attachment_wrapper';
import type { ServicesWrapperProps } from '../services_wrapper';
import ServicesWrapper from '../services_wrapper';

export interface AttachmentContentProps {
  externalReferenceMetadata: IExternalReferenceMetaDataProps;
  services: ServicesWrapperProps['services'];
}

export const AttachmentContent = (props: AttachmentContentProps) => {
  const { services: osqueryServices, externalReferenceMetadata } = props;

  return (
    <ServicesWrapper services={osqueryServices}>
      <EuiFlexGroup data-test-subj="osquery-attachment-content">
        <EuiFlexItem>
          <PackQueriesAttachmentWrapper
            actionId={externalReferenceMetadata.actionId}
            queryId={externalReferenceMetadata.queryId}
            agentIds={externalReferenceMetadata.agentIds}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </ServicesWrapper>
  );
};

// eslint-disable-next-line import/no-default-export
export { AttachmentContent as default };
