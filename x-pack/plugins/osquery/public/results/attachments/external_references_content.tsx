/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { QueryClientProvider } from 'react-query';
import { queryClient } from '../../query_client';
import { ResultsTable } from '../results_table';

export const AttachmentContent: React.FC = (props: any) => {
  console.log({ props });

  return (
    <EuiFlexGroup data-test-subj="test-attachment-content">
      <EuiFlexItem>
        <QueryClientProvider client={queryClient}>
          <ResultsTable
            actionId={props.externalReferenceMetadata?.actionId}
            agentIds={props.externalReferenceMetadata?.agentIds}
            startDate={''}
            // endDate={endDate}
            // addToTimeline={addToTimeline}
          />
        </QueryClientProvider>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

// eslint-disable-next-line import/no-default-export
export { AttachmentContent as default };
