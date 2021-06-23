/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useEffect, useRef } from 'react';
import styled from 'styled-components';

import {
  EuiText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingContent,
  EuiEmptyPrompt,
} from '@elastic/eui';
import { useDispatch } from 'react-redux';
import { LogEntry } from './components/log_entry';
import * as i18 from '../translations';
import { Immutable, ActivityLog } from '../../../../../../common/endpoint/types';
import { AsyncResourceState } from '../../../../state';
import { useEndpointSelector } from '../hooks';
import { EndpointAction } from '../../store/action';
import {
  getActivityLogDataPaging,
  getActivityLogError,
  getActivityLogIterableData,
  getActivityLogRequestLoaded,
  getLastLoadedActivityLogData,
  getActivityLogRequestLoading,
} from '../../store/selectors';

const LoadMoreTrigger = styled.div`
  height: 6px;
  width: 100%;
`;

export const EndpointActivityLog = memo(
  ({ activityLog }: { activityLog: AsyncResourceState<Immutable<ActivityLog>> }) => {
    const activityLogLoading = useEndpointSelector(getActivityLogRequestLoading);
    const activityLogLoaded = useEndpointSelector(getActivityLogRequestLoaded);
    const activityLastLogData = useEndpointSelector(getLastLoadedActivityLogData);
    const activityLogData = useEndpointSelector(getActivityLogIterableData);
    const activityLogSize = activityLogData.length;
    const activityLogError = useEndpointSelector(getActivityLogError);
    const dispatch = useDispatch<(action: EndpointAction) => void>();
    const { page, pageSize, disabled: isPagingDisabled } = useEndpointSelector(
      getActivityLogDataPaging
    );

    const loadMoreTrigger = useRef<HTMLInputElement | null>(null);
    const getActivityLog = useCallback(
      (entries: IntersectionObserverEntry[]) => {
        const isTargetIntersecting = entries.some((entry) => entry.isIntersecting);
        if (isTargetIntersecting && activityLogLoaded && !isPagingDisabled) {
          dispatch({
            type: 'appRequestedEndpointActivityLog',
            payload: {
              page: page + 1,
              pageSize,
            },
          });
        }
      },
      [activityLogLoaded, dispatch, isPagingDisabled, page, pageSize]
    );

    useEffect(() => {
      const observer = new IntersectionObserver(getActivityLog);
      const element = loadMoreTrigger.current;
      if (element) {
        observer.observe(element);
      }
      return () => {
        observer.disconnect();
      };
    }, [getActivityLog]);

    return (
      <>
        <EuiFlexGroup direction="column" style={{ height: '85vh' }}>
          {(activityLogLoaded && !activityLogSize) || activityLogError ? (
            <EuiFlexItem>
              <EuiEmptyPrompt
                iconType="editorUnorderedList"
                titleSize="s"
                title={<h2>{i18.ACTIVITY_LOG.LogEntry.emptyState.title}</h2>}
                body={<p>{i18.ACTIVITY_LOG.LogEntry.emptyState.body}</p>}
                data-test-subj="activityLogEmpty"
              />
            </EuiFlexItem>
          ) : (
            <>
              <EuiFlexItem grow={true}>
                {activityLogLoaded &&
                  activityLogData.map((logEntry) => (
                    <LogEntry key={`${logEntry.item.id}`} logEntry={logEntry} />
                  ))}
                {activityLogLoading &&
                  activityLastLogData?.data.map((logEntry) => (
                    <LogEntry key={`${logEntry.item.id}`} logEntry={logEntry} />
                  ))}
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                {activityLogLoading && <EuiLoadingContent lines={3} />}
                {(!activityLogLoading || !isPagingDisabled) && (
                  <LoadMoreTrigger ref={loadMoreTrigger} />
                )}
                {isPagingDisabled && !activityLogLoading && (
                  <EuiText color="subdued" textAlign="center">
                    <p>{i18.ACTIVITY_LOG.LogEntry.endOfLog}</p>
                  </EuiText>
                )}
              </EuiFlexItem>
            </>
          )}
        </EuiFlexGroup>
      </>
    );
  }
);

EndpointActivityLog.displayName = 'EndpointActivityLog';
