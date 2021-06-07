/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';

import { EuiAvatar, EuiComment, EuiText } from '@elastic/eui';
import { Immutable, EndpointAction } from '../../../../../../../common/endpoint/types';
import { FormattedDateAndTime } from '../../../../../../common/components/endpoint/formatted_date_time';
import { useEuiTheme } from '../../../../../../common/lib/theme/use_eui_theme';

export const LogEntry = memo(
  ({ endpointAction }: { endpointAction: Immutable<EndpointAction> }) => {
    const euiTheme = useEuiTheme();
    const isIsolated = endpointAction?.data.command === 'isolate';

    // do this better when we can distinguish between endpoint events vs user events
    const iconType = endpointAction.user_id === 'sys' ? 'dot' : isIsolated ? 'lock' : 'lockOpen';
    const commentType = endpointAction.user_id === 'sys' ? 'update' : 'regular';
    const timelineIcon = (
      <EuiAvatar
        name="Timeline Icon"
        size={endpointAction.user_id === 'sys' ? 's' : 'm'}
        color={euiTheme.euiColorLightestShade}
        iconColor="subdued"
        iconType={iconType}
      />
    );
    const event = `${isIsolated ? 'isolated' : 'unisolated'} host`;
    const hasComment = !!endpointAction.data.comment;

    return (
      <EuiComment
        type={commentType}
        username={endpointAction.user_id}
        timestamp={FormattedDateAndTime({
          date: new Date(endpointAction['@timestamp']),
          showRelativeTime: true,
        })}
        event={event}
        timelineIcon={timelineIcon}
        data-test-subj="timelineEntry"
      >
        {hasComment ? (
          <EuiText size="s">
            <p>{endpointAction.data.comment}</p>
          </EuiText>
        ) : undefined}
      </EuiComment>
    );
  }
);

LogEntry.displayName = 'LogEntry';
