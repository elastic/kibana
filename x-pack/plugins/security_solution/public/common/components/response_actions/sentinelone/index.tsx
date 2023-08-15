/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiComment, EuiAvatar } from '@elastic/eui';
import { FormattedRelative } from '@kbn/i18n-react';
import { SentinelOneLogo } from '@kbn/stack-connectors-plugin/public/common';
import { SentinelOneScriptStatus } from './script_status';

const avatarStyles = {
  padding: 8,
};

const SentinelOneActionResultComponent = ({
  timestamp,
  params,
  data,
}: {
  timestamp?: string;
  params?: {
    subAction?: string;
    subActionParams?: {
      processName?: string;
      hostname?: string;
    };
  };
  data?: {
    data?: {
      parentTaskId?: string;
    };
  };
}) => {
  const event = useMemo(() => {
    if (params?.subAction === 'killProcess') {
      return (
        <>
          {'Terminated process '}
          <b>{params?.subActionParams?.processName}</b>
          {' on host '}
          <b>{params?.subActionParams?.hostname}</b>
        </>
      );
    } else if (params?.subAction === 'isolateAgent') {
      return (
        <>
          {'Isolated host '}
          <b>{params?.subActionParams?.hostname}</b>
        </>
      );
    } else if (params?.subAction === 'releaseAgent') {
      return (
        <>
          {'Released host '}
          <b>{params?.subActionParams?.hostname}</b>
        </>
      );
    } else {
      return (
        <>
          {`Executed action `}
          <b>{params?.subAction}</b>
        </>
      );
    }
  }, [params?.subAction, params?.subActionParams?.hostname, params?.subActionParams?.processName]);

  const commentBody = useMemo(() => {
    const parentTaskId = data?.data?.parentTaskId;
    if (params?.subAction && parentTaskId) {
      return (
        !['isolateAgent', 'releaseAgent'].includes(params?.subAction) && (
          <SentinelOneScriptStatus parentTaskId={parentTaskId} />
        )
      );
    }

    return <></>;
  }, [data?.data?.parentTaskId, params?.subAction]);

  return (
    <EuiComment
      username={'sentinelone'}
      timestamp={<FormattedRelative value={timestamp as string} />}
      event={event}
      data-test-subj={'endpoint-results-comment'}
      timelineAvatar={
        <EuiAvatar
          name="sentinelone"
          iconType={SentinelOneLogo}
          color="subdued"
          css={avatarStyles}
        />
      }
    >
      {commentBody}
    </EuiComment>
  );
};

export const SentinelOneActionResult = React.memo(SentinelOneActionResultComponent);
