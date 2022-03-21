/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import styled from 'styled-components';

import { EuiComment, EuiText, EuiAvatarProps, EuiCommentProps, IconType } from '@elastic/eui';
import {
  Immutable,
  ActivityLogEntry,
  ActivityLogItemTypes,
} from '../../../../../../../common/endpoint/types';
import { FormattedRelativePreferenceDate } from '../../../../../../common/components/formatted_date';
import { LogEntryTimelineIcon } from './log_entry_timeline_icon';
import { useEuiTheme } from '../../../../../../common/lib/theme/use_eui_theme';

import * as i18 from '../../translations';

const useLogEntryUIProps = (
  logEntry: Immutable<ActivityLogEntry>,
  theme: ReturnType<typeof useEuiTheme>
): {
  actionEventTitle: string;
  avatarColor: EuiAvatarProps['color'];
  avatarIconColor: EuiAvatarProps['iconColor'];
  avatarSize: EuiAvatarProps['size'];
  commentText: string;
  commentType: EuiCommentProps['type'];
  displayComment: boolean;
  displayResponseEvent: boolean;
  failedActionEventTitle: string;
  iconType: IconType;
  isResponseEvent: boolean;
  isSuccessful: boolean;
  isCompleted: boolean;
  responseEventTitle: string;
  username: string | React.ReactNode;
} => {
  return useMemo(() => {
    let iconType: IconType = 'dot';
    let commentType: EuiCommentProps['type'] = 'update';
    let commentText: string = '';
    let avatarColor: EuiAvatarProps['color'] = theme.euiColorLightestShade;
    let avatarIconColor: EuiAvatarProps['iconColor'];
    let avatarSize: EuiAvatarProps['size'] = 's';
    let failedActionEventTitle: string = '';
    let isIsolateAction: boolean = false;
    let isResponseEvent: boolean = false;
    let isSuccessful: boolean = false;
    let isCompleted: boolean = false;
    let displayComment: boolean = false;
    let displayResponseEvent: boolean = true;
    let username: EuiCommentProps['username'] = '';

    if (logEntry.type === ActivityLogItemTypes.FLEET_ACTION) {
      avatarSize = 'm';
      commentType = 'regular';
      commentText = logEntry.item.data.data.comment?.trim() ?? '';
      displayResponseEvent = false;
      iconType = 'lockOpen';
      username = logEntry.item.data.user_id;
      if (logEntry.item.data.data) {
        const data = logEntry.item.data.data;
        if (data.commandDef === 'isolate') {
          iconType = 'lock';
          isIsolateAction = true;
        }
        if (commentText) {
          displayComment = true;
        }
      }
    }
    if (logEntry.type === ActivityLogItemTypes.ACTION) {
      avatarSize = 'm';
      commentType = 'regular';
      commentText = logEntry.item.data.EndpointActions.data.comment?.trim() ?? '';
      displayResponseEvent = false;
      iconType = 'lockOpen';
      username = logEntry.item.data.user.id;
      avatarIconColor = theme.euiColorVis9_behindText;
      failedActionEventTitle = i18.ACTIVITY_LOG.LogEntry.action.failedEndpointReleaseAction;
      if (logEntry.item.data.EndpointActions.data) {
        const data = logEntry.item.data.EndpointActions.data;
        if (data.commandDef === 'isolate') {
          iconType = 'lock';
          failedActionEventTitle = i18.ACTIVITY_LOG.LogEntry.action.failedEndpointIsolateAction;
        }
        if (commentText) {
          displayComment = true;
        }
      }
    } else if (logEntry.type === ActivityLogItemTypes.FLEET_RESPONSE) {
      isResponseEvent = true;
      if (logEntry.item.data.action_data.commandDef === 'isolate') {
        isIsolateAction = true;
      }
      if (!!logEntry.item.data.completed_at && !logEntry.item.data.error) {
        isSuccessful = true;
      } else {
        avatarColor = theme.euiColorVis9_behindText;
      }
    } else if (logEntry.type === ActivityLogItemTypes.RESPONSE) {
      iconType = 'check';
      isResponseEvent = true;
      if (logEntry.item.data.EndpointActions.data.commandDef === 'isolate') {
        isIsolateAction = true;
      }
      if (logEntry.item.data.EndpointActions.completed_at) {
        isCompleted = true;
        if (!logEntry.item.data.error) {
          isSuccessful = true;
          avatarColor = theme.euiColorVis0_behindText;
        } else {
          isSuccessful = false;
          avatarColor = theme.euiColorVis9_behindText;
        }
      }
    }

    const actionEventTitle = isIsolateAction
      ? i18.ACTIVITY_LOG.LogEntry.action.isolatedAction
      : i18.ACTIVITY_LOG.LogEntry.action.unisolatedAction;

    const getResponseEventTitle = () => {
      if (isIsolateAction) {
        if (isCompleted) {
          if (isSuccessful) {
            return i18.ACTIVITY_LOG.LogEntry.response.isolationCompletedAndSuccessful;
          }
          return i18.ACTIVITY_LOG.LogEntry.response.isolationCompletedAndUnsuccessful;
        } else if (isSuccessful) {
          return i18.ACTIVITY_LOG.LogEntry.response.isolationSuccessful;
        } else {
          return i18.ACTIVITY_LOG.LogEntry.response.isolationFailed;
        }
      } else {
        if (isCompleted) {
          if (isSuccessful) {
            return i18.ACTIVITY_LOG.LogEntry.response.unisolationCompletedAndSuccessful;
          }
          return i18.ACTIVITY_LOG.LogEntry.response.unisolationCompletedAndUnsuccessful;
        } else if (isSuccessful) {
          return i18.ACTIVITY_LOG.LogEntry.response.unisolationSuccessful;
        } else {
          return i18.ACTIVITY_LOG.LogEntry.response.unisolationFailed;
        }
      }
    };

    return {
      actionEventTitle,
      avatarColor,
      avatarIconColor,
      avatarSize,
      commentText,
      commentType,
      displayComment,
      displayResponseEvent,
      failedActionEventTitle,
      iconType,
      isResponseEvent,
      isSuccessful,
      isCompleted,
      responseEventTitle: getResponseEventTitle(),
      username,
    };
  }, [logEntry, theme]);
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
  const theme = useEuiTheme();
  const {
    actionEventTitle,
    avatarColor,
    avatarIconColor,
    avatarSize,
    commentText,
    commentType,
    displayComment,
    displayResponseEvent,
    failedActionEventTitle,
    iconType,
    isResponseEvent,
    responseEventTitle,
    username,
  } = useLogEntryUIProps(logEntry, theme);

  return (
    <StyledEuiComment
      type={(commentType ?? 'regular') as EuiCommentProps['type']}
      username={username}
      timestamp={<FormattedRelativePreferenceDate value={logEntry.item.data['@timestamp']} />}
      event={
        <b>
          {displayResponseEvent
            ? responseEventTitle
            : failedActionEventTitle
            ? failedActionEventTitle
            : actionEventTitle}
        </b>
      }
      timelineIcon={
        <LogEntryTimelineIcon
          {...{ avatarSize, iconType, isResponseEvent, avatarColor, avatarIconColor }}
        />
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
