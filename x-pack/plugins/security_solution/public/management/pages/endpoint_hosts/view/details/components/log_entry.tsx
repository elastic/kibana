/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import styled from 'styled-components';

import { EuiAvatar, EuiAvatarProps, EuiCommentProps, EuiComment, EuiText } from '@elastic/eui';
import { Immutable, ActivityLogEntry } from '../../../../../../../common/endpoint/types';
import { FormattedDateAndTime } from '../../../../../../common/components/endpoint/formatted_date_time';
import { useEuiTheme } from '../../../../../../common/lib/theme/use_eui_theme';

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
  const euiTheme = useEuiTheme();
  let iconType = 'dot';
  let commentType: EuiCommentProps['type'] = 'update';
  let commentText;
  let avatarSize: EuiAvatarProps['size'] = 's';
  let isIsolateAction = false;
  let isSuccessful = false;
  let displayComment = false;
  let displayResponseEvent = true;
  let username: EuiCommentProps['username'] = '';
  if (logEntry.type === 'action') {
    avatarSize = 'm';
    commentType = 'regular';
    commentText = logEntry.item.data.data.comment ?? '';
    displayResponseEvent = false;
    iconType = 'lockOpen';
    username = logEntry.item.data.user_id;
    if (logEntry.item.data.data) {
      const data = logEntry.item.data.data;
      if (data.command === 'isolate') {
        iconType = 'lock';
        isIsolateAction = true;
      }
      if (data.comment) {
        displayComment = true;
      }
    }
  } else if (logEntry.type === 'response') {
    if (logEntry.item.data.action_data.command === 'isolate') {
      isIsolateAction = true;
    }
    if (!!logEntry.item.data.completed_at && !logEntry.item.data.error) {
      isSuccessful = true;
    }
  }

  const timelineIcon = (
    <EuiAvatar
      name="Timeline Icon"
      size={avatarSize}
      color={
        logEntry.type === 'response' && !isSuccessful
          ? euiTheme.euiColorVis9_behindText
          : euiTheme.euiColorLightestShade
      }
      iconColor="default"
      iconType={iconType}
    />
  );
  const actionEvent = `${isIsolateAction ? 'isolated' : 'unisolated'} host`;
  const responseEvent = `host ${isIsolateAction ? 'isolation' : 'unisolation'} ${
    isSuccessful ? 'successful' : 'failed'
  }`;

  return (
    <StyledEuiComment
      type={commentType}
      username={username}
      timestamp={FormattedDateAndTime({
        date: new Date(logEntry.item.data['@timestamp']),
        showRelativeTime: true,
      })}
      event={<b>{displayResponseEvent ? responseEvent : actionEvent}</b>}
      timelineIcon={timelineIcon}
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
