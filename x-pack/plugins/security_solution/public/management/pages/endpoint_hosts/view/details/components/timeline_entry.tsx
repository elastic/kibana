/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import styled from 'styled-components';

import { EuiComment, EuiText } from '@elastic/eui';
import { Immutable, EndpointAction } from '../../../../../../../common/endpoint/types';

const TimelineItem = styled(EuiComment)``;

export const TimelineEntry = ({
  endpointAction,
}: {
  endpointAction: Immutable<EndpointAction>;
}) => {
  const isIsolated = endpointAction?.data.command === 'isolate';
  const timelineIcon = isIsolated ? 'lock' : 'lockOpen';
  const event = `${isIsolated ? 'isolated' : 'unisolated'} host`;
  const hasComment = !!endpointAction.data.comment;
  // do this better when we can distinguish between endpoint events vs user events
  const commentType = endpointAction.user_id === 'sys' ? 'update' : 'regular';
  return (
    <TimelineItem
      type={commentType}
      username={endpointAction.user_id}
      timestamp={endpointAction['@timestamp']}
      event={event}
      timelineIcon={timelineIcon}
      data-test-subj="timelineEntry"
    >
      {hasComment ? (
        <EuiText size="s">
          <p>{endpointAction.data.comment}</p>
        </EuiText>
      ) : undefined}
    </TimelineItem>
  );
};

TimelineEntry.displayName = 'TimelineEntry';
