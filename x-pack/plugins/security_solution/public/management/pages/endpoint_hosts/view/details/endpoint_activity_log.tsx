/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useEffect, useRef } from 'react';
import styled from 'styled-components';

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingContent,
  EuiEmptyPrompt,
  EuiSpacer,
} from '@elastic/eui';
import { useDispatch } from 'react-redux';
import { LogEntry } from './components/log_entry';
import * as i18 from '../translations';
import { SearchBar } from '../../../../components/search_bar';
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

const Sentinel = styled.div`
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
    const dispatch = useDispatch<(a: EndpointAction) => void>();
    const { page, pageSize, disabled: isPagingDisabled } = useEndpointSelector(
      getActivityLogDataPaging
    );

    // TODO
    const onSearch = useCallback(() => {}, []);

    const fetchMoreCallOut = useRef<HTMLInputElement | null>(null);
    const getActivityLog = useCallback(
      (entries: IntersectionObserverEntry[]) => {
        const isIntersecting = entries.some((entry) => entry.intersectionRatio > 0);
        if (isIntersecting && activityLogLoaded && !isPagingDisabled) {
          dispatch({
            type: 'appRequestedEndpointActivityLog',
            payload: {
              page: page + 1,
              pageSize,
            },
          });
        }
        if (!isIntersecting) {
          dispatch({
            type: 'endpointDetailsActivityLogUpdatePaging',
            payload: {
              disabled: false,
              page,
              pageSize,
            },
          });
        }
      },
      [activityLogLoaded, dispatch, isPagingDisabled, page, pageSize]
    );

    useEffect(() => {
      const observer = new IntersectionObserver(getActivityLog, {
        rootMargin: '-50px',
      });
      const element = fetchMoreCallOut.current;
      if (element) {
        observer.observe(element);
      }
      return () => {
        observer.disconnect();
      };
    }, [getActivityLog]);

    return (
      <>
        <EuiSpacer size="l" />
        {(activityLogLoaded && !activityLogSize) || activityLogError ? (
          <EuiEmptyPrompt
            iconType="editorUnorderedList"
            titleSize="s"
            title={<h2>{'No logged actions'}</h2>}
            body={<p>{'No actions have been logged for this endpoint.'}</p>}
          />
        ) : (
          <div>
            <SearchBar onSearch={onSearch} placeholder={i18.SEARCH_ACTIVITY_LOG} />
            <EuiSpacer size="l" />
            <EuiFlexGroup direction="column">
              <EuiFlexItem>
                {activityLogLoaded &&
                  activityLogData.map((logEntry) => (
                    <LogEntry key={`${logEntry.item.id}`} logEntry={logEntry} />
                  ))}
                {activityLogLoading &&
                  activityLastLogData?.data.map((logEntry) => (
                    <LogEntry key={`${logEntry.item.id}`} logEntry={logEntry} />
                  ))}
              </EuiFlexItem>
              <EuiFlexItem>
                {activityLogLoading && <EuiLoadingContent lines={3} />}
                {!activityLogLoading && !isPagingDisabled && <Sentinel ref={fetchMoreCallOut} />}
                )}
              </EuiFlexItem>
            </EuiFlexGroup>
          </div>
        )}
      </>
    );
  }
);

EndpointActivityLog.displayName = 'EndpointActivityLog';
