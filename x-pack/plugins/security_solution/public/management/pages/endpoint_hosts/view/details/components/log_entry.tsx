/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import styled from 'styled-components';

import { EuiComment, EuiCommentProps, EuiText } from '@elastic/eui';
import { Immutable, ActivityLogEntry } from '../../../../../../../common/endpoint/types';
import { FormattedDateAndTime } from '../../../../../../common/components/endpoint/formatted_date_time';
import { LogEntryTimelineIcon } from './log_entry_timeline_icon';
import { useLogEntryUIElements } from '../../hooks/hooks';

const StyledEuiComment = styled(EuiComment)`
  .euiCommentEvent__headerTimestamp {
    display: flex;
    :before {
      content: '';
      background-color: ${(props) => props.theme.eui.euiColorInk};
      display: block;
      width: ${(props) => props.theme.eui.euiBorderWidthThick};
      height: ${(props) => props.theme.eui.euiBorderWidthThick};
      margin: 0 ${(props) => props.theme.eui.euiSizeXS} 0 ${(props) => props.theme.eui.euiSizeS};
      border-radius: 50%;
      content: '';
      margin: 0 8px 0 4px;
      border-radius: 50%;
      position: relative;
      top: 10px;
    }
  }
`;

export const LogEntry = memo(({ logEntry }: { logEntry: Immutable<ActivityLogEntry> }) => {
  const {
    actionEventTitle,
    avatarSize,
    commentText,
    commentType,
    displayComment,
    displayResponseEvent,
    iconType,
    isResponseEvent,
    isSuccessful,
    responseEventTitle,
    username,
  } = useLogEntryUIElements(logEntry);

  return (
    <StyledEuiComment
      type={(commentType ?? 'regular') as EuiCommentProps['type']}
      username={username}
      timestamp={FormattedDateAndTime({
        date: new Date(logEntry.item.data['@timestamp']),
        showRelativeTime: true,
      })}
      event={<b>{displayResponseEvent ? responseEventTitle : actionEventTitle}</b>}
      timelineIcon={
        <LogEntryTimelineIcon {...{ avatarSize, iconType, isResponseEvent, isSuccessful }} />
      }
      data-test-subj="timelineEntry"
    >
      {displayComment ? (
        <EuiText size="s">
          <p>{commentText}</p>
        </EuiText>
      ) : undefined}
    </StyledEuiComment>
  );
});

LogEntry.displayName = 'LogEntry';
