/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '../../query_client';

import { PackQueriesAttachmentWrapper } from './pack_queries_attachment_wrapper';

export interface AttachmentContentProps {
  externalReferenceMetadata: {
    actionId: string;
    agentIds: string[];
    queryId: string;
  };
}

export const AttachmentContent = (props: AttachmentContentProps) => (
  <EuiFlexGroup data-test-subj="osquery-attachment-content">
    <EuiFlexItem>
      <QueryClientProvider client={queryClient}>
        <PackQueriesAttachmentWrapper
          actionId={props.externalReferenceMetadata?.actionId}
          queryId={props.externalReferenceMetadata?.queryId}
          agentIds={props.externalReferenceMetadata?.agentIds}
        />
      </QueryClientProvider>
    </EuiFlexItem>
  </EuiFlexGroup>
);

// eslint-disable-next-line import/no-default-export
export { AttachmentContent as default };
