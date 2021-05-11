/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import styled from 'styled-components';

import { EuiComment, EuiPanel, EuiSpacer, EuiText } from '@elastic/eui';
import { EndpointAction } from '../../../../../../../common/endpoint/types';

const TimelineItem = styled(EuiComment)`
  figure {
    border: 0;
  }
  figcaption.euiCommentEvent__header {
    background-color: transparent;
    border: 0;
  }
`;

const CommentItem = styled.div`
  max-width: 85%;
  > div {
    display: inline-flex;
  }
`;

export const TimelineEntry = ({ endpointAction }: { endpointAction: EndpointAction }) => {
  const isIsolated = endpointAction?.data.command === 'isolate';
  const timelineIcon = isIsolated ? 'lock' : 'lockOpen';
  const event = `${isIsolated ? 'isolated' : 'unisolated'} the endpoint`;
  const hasComment = !!endpointAction.data.comment;
  return (
    <TimelineItem
      type="regular"
      username={endpointAction.user_id}
      event={event}
      timelineIcon={timelineIcon}
      data-test-subj="timelineEntry"
    >
      <EuiText size="s">{endpointAction['@timestamp']}</EuiText>
      <EuiSpacer size="m" />
      {hasComment ? (
        <CommentItem>
          <EuiPanel hasBorder={true} paddingSize="s">
            <EuiText size="s">
              <p>{endpointAction.data.comment}</p>
            </EuiText>
          </EuiPanel>
        </CommentItem>
      ) : undefined}
    </TimelineItem>
  );
};

TimelineEntry.displayName = 'TimelineEntry';
