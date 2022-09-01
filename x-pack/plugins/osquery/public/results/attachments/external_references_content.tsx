/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '../../query_client';
import { ResultsTable } from '../results_table';

import { useKibana } from '../../common/lib/kibana';

const TimelineComponent = React.memo((props) => <EuiButtonEmpty {...props} size="xs" />);
TimelineComponent.displayName = 'TimelineComponent';

export interface AttachmentContentProps {
  externalReferenceMetadata: {
    actionId: string;
    agentIds: string[];
  };
}

export const AttachmentContent = (props: AttachmentContentProps) => {
  const {
    services: { timelines },
  } = useKibana();

  const { getAddToTimelineButton } = timelines.getHoverActions();

  const handleAddToTimeline = useCallback(
    (payload: { query: [string, string]; isIcon?: true }) => {
      const {
        query: [field, value],
        isIcon,
      } = payload;
      const providerA = {
        and: [],
        enabled: true,
        excluded: false,
        id: value,
        kqlQuery: '',
        name: value,
        queryMatch: {
          field,
          value,
          operator: ':' as const,
        },
      };

      return getAddToTimelineButton({
        dataProvider: providerA,
        field: value,
        ownFocus: false,
        ...(isIcon ? { showTooltip: true } : { Component: TimelineComponent }),
      });
    },
    [getAddToTimelineButton]
  );

  const addToTimeline = useCallback(
    () =>
      handleAddToTimeline({
        query: ['action_id', props.externalReferenceMetadata.actionId],
      }),
    [handleAddToTimeline, props.externalReferenceMetadata.actionId]
  );

  return (
    <EuiFlexGroup data-test-subj="osquery-attachment-content">
      <EuiFlexItem>
        <QueryClientProvider client={queryClient}>
          <ResultsTable
            actionId={props.externalReferenceMetadata.actionId}
            agentIds={props.externalReferenceMetadata?.agentIds}
            addToTimeline={addToTimeline}
          />
        </QueryClientProvider>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

// eslint-disable-next-line import/no-default-export
export { AttachmentContent as default };
