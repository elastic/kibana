/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiAvatarProps, EuiCommentProps, IconType } from '@elastic/eui';

import { useSelector } from 'react-redux';
import { useMemo, useRef } from 'react';
import { EndpointState } from '../../types';
import { State } from '../../../../../common/store';
import {
  MANAGEMENT_STORE_ENDPOINTS_NAMESPACE,
  MANAGEMENT_STORE_GLOBAL_NAMESPACE,
} from '../../../../common/constants';
import { useKibana } from '../../../../../common/lib/kibana';
import { Immutable, ActivityLogEntry } from '../../../../../../common/endpoint/types';
import * as i18 from '../translations';

export function useEndpointSelector<TSelected>(selector: (state: EndpointState) => TSelected) {
  return useSelector(function (state: State) {
    return selector(
      state[MANAGEMENT_STORE_GLOBAL_NAMESPACE][
        MANAGEMENT_STORE_ENDPOINTS_NAMESPACE
      ] as EndpointState
    );
  });
}

/**
 * Returns an object that contains Fleet app and URL information
 */
export const useIngestUrl = (subpath: string): { url: string; appId: string; appPath: string } => {
  const { services } = useKibana();
  return useMemo(() => {
    const appPath = `#/${subpath}`;
    return {
      url: `${services.application.getUrlForApp('fleet')}${appPath}`,
      appId: 'fleet',
      appPath,
    };
  }, [services.application, subpath]);
};
/**
 * Returns an object that contains Fleet app and URL information
 */
export const useAgentDetailsIngestUrl = (
  agentId: string
): { url: string; appId: string; appPath: string } => {
  const { services } = useKibana();
  return useMemo(() => {
    const appPath = `#/fleet/agents/${agentId}/activity`;
    return {
      url: `${services.application.getUrlForApp('fleet')}${appPath}`,
      appId: 'fleet',
      appPath,
    };
  }, [services.application, agentId]);
};

export const useLogEntryUIElements = (logEntry: Immutable<ActivityLogEntry>) => {
  const iconType = useRef<IconType>('dot');
  const commentType = useRef<EuiCommentProps['type']>('update');
  const commentText = useRef<string | undefined>();
  const avatarSize = useRef<EuiAvatarProps['size']>('s');
  const isIsolateAction = useRef<boolean>(false);
  const isResponseEvent = useRef<boolean>(false);
  const isSuccessful = useRef<boolean>(false);
  const displayComment = useRef<boolean>(false);
  const displayResponseEvent = useRef<boolean>(true);
  const username = useRef<EuiCommentProps['username']>('');

  return useMemo(() => {
    if (logEntry.type === 'action') {
      avatarSize.current = 'm';
      commentType.current = 'regular';
      commentText.current = logEntry.item.data.data.comment ?? '';
      displayResponseEvent.current = false;
      iconType.current = 'lockOpen';
      username.current = logEntry.item.data.user_id;
      if (logEntry.item.data.data) {
        const data = logEntry.item.data.data;
        if (data.command === 'isolate') {
          iconType.current = 'lock';
          isIsolateAction.current = true;
        }
        if (data.comment) {
          displayComment.current = true;
        }
      }
    } else if (logEntry.type === 'response') {
      isResponseEvent.current = true;
      if (logEntry.item.data.action_data.command === 'isolate') {
        isIsolateAction.current = true;
      }
      if (!!logEntry.item.data.completed_at && !logEntry.item.data.error) {
        isSuccessful.current = true;
      }
    }

    const actionEventTitle = `${
      isIsolateAction.current
        ? i18.ACTIVITY_LOG.LogEntry.action.isolated
        : i18.ACTIVITY_LOG.LogEntry.action.unisolated
    } ${i18.ACTIVITY_LOG.LogEntry.host}`;
    const responseEventTitle = `${i18.ACTIVITY_LOG.LogEntry.host}  ${
      isIsolateAction.current
        ? i18.ACTIVITY_LOG.LogEntry.response.isolation
        : i18.ACTIVITY_LOG.LogEntry.response.unisolation
    } ${
      isSuccessful.current
        ? i18.ACTIVITY_LOG.LogEntry.response.successful
        : i18.ACTIVITY_LOG.LogEntry.response.failed
    }`;

    return {
      actionEventTitle,
      avatarSize: avatarSize.current,
      commentText: commentText.current,
      commentType: commentType.current,
      displayComment: displayComment.current,
      displayResponseEvent: displayResponseEvent.current,
      iconType: iconType.current,
      isResponseEvent: isResponseEvent.current,
      isSuccessful: isSuccessful.current,
      responseEventTitle,
      username: username.current,
    };
  }, [logEntry]);
};
