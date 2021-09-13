/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import styled from 'styled-components';

import { EuiComment, EuiText, EuiAvatarProps, EuiCommentProps, IconType } from '@elastic/eui';
import { Immutable, ActivityLogEntry } from '../../../../../../../common/endpoint/types';
import { FormattedRelativePreferenceDate } from '../../../../../../common/components/formatted_date';
import { LogEntryTimelineIcon } from './log_entry_timeline_icon';

import * as i18 from '../../translations';

const useLogEntryUIProps = (
  logEntry: Immutable<ActivityLogEntry>
): {
  actionEventTitle: string;
  avatarSize: EuiAvatarProps['size'];
  commentText: string;
  commentType: EuiCommentProps['type'];
  displayComment: boolean;
  displayResponseEvent: boolean;
  iconType: IconType;
  isResponseEvent: boolean;
  isSuccessful: boolean;
  responseEventTitle: string;
  username: string | React.ReactNode;
} => {
  return useMemo(() => {
    let iconType: IconType = 'dot';
    let commentType: EuiCommentProps['type'] = 'update';
    let commentText: string = '';
    let avatarSize: EuiAvatarProps['size'] = 's';
    let isIsolateAction: boolean = false;
    let isResponseEvent: boolean = false;
    let isSuccessful: boolean = false;
    let displayComment: boolean = false;
    let displayResponseEvent: boolean = true;
    let username: EuiCommentProps['username'] = '';

    if (logEntry.type === 'action') {
      avatarSize = 'm';
      commentType = 'regular';
      commentText = logEntry.item.data.data.comment?.trim() ?? '';
      displayResponseEvent = false;
      iconType = 'lockOpen';
      username = logEntry.item.data.user_id;
      if (logEntry.item.data.data) {
        const data = logEntry.item.data.data;
        if (data.command === 'isolate') {
          iconType = 'lock';
          isIsolateAction = true;
        }
        if (commentText) {
          displayComment = true;
        }
      }
    } else if (logEntry.type === 'response') {
      isResponseEvent = true;
      if (logEntry.item.data.action_data.command === 'isolate') {
        isIsolateAction = true;
      }
      if (!!logEntry.item.data.completed_at && !logEntry.item.data.error) {
        isSuccessful = true;
      }
    }

    const actionEventTitle = isIsolateAction
      ? i18.ACTIVITY_LOG.LogEntry.action.isolatedAction
      : i18.ACTIVITY_LOG.LogEntry.action.unisolatedAction;

    const getResponseEventTitle = () => {
      if (isIsolateAction) {
        if (isSuccessful) {
          return i18.ACTIVITY_LOG.LogEntry.response.isolationSuccessful;
        } else {
          return i18.ACTIVITY_LOG.LogEntry.response.isolationFailed;
        }
      } else {
        if (isSuccessful) {
          return i18.ACTIVITY_LOG.LogEntry.response.unisolationSuccessful;
        } else {
          return i18.ACTIVITY_LOG.LogEntry.response.unisolationFailed;
        }
      }
    };

    return {
      actionEventTitle,
      avatarSize,
      commentText,
      commentType,
      displayComment,
      displayResponseEvent,
      iconType,
      isResponseEvent,
      isSuccessful,
      responseEventTitle: getResponseEventTitle(),
      username,
    };
  }, [logEntry]);
};

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
  } = useLogEntryUIProps(logEntry);

  return (
    <StyledEuiComment
      type={(commentType ?? 'regular') as EuiCommentProps['type']}
      username={username}
      timestamp={<FormattedRelativePreferenceDate value={logEntry.item.data['@timestamp']} />}
      event={<b>{displayResponseEvent ? responseEventTitle : actionEventTitle}</b>}
      timelineIcon={
        <LogEntryTimelineIcon {...{ avatarSize, iconType, isResponseEvent, isSuccessful }} />
      }
      data-test-subj="timelineEntry"
    >
      {displayComment ? (
        <EuiText size="s" data-test-subj="activityLogCommentText">
          <p>{commentText}</p>
        </EuiText>
      ) : undefined}
    </StyledEuiComment>
  );
});

LogEntry.displayName = 'LogEntry';
