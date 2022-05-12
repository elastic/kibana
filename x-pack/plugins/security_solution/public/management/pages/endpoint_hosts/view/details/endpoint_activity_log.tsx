/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useEffect, useMemo, useRef } from 'react';
import styled from 'styled-components';

import {
  EuiCallOut,
  EuiText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingContent,
  EuiEmptyPrompt,
  EuiSpacer,
} from '@elastic/eui';
import { useDispatch } from 'react-redux';
import { LogEntry } from './components/log_entry';
import { DateRangePicker } from './components/activity_log_date_range_picker';
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
  getActivityLogUninitialized,
} from '../../store/selectors';

const StyledEuiFlexGroup = styled(EuiFlexGroup)<{ isShorter: boolean }>`
  height: ${({ isShorter }) => (isShorter ? '25vh' : '85vh')};
`;
const LoadMoreTrigger = styled.div`
  height: ${(props) => props.theme.eui.euiSizeXS};
  width: ${(props) => props.theme.eui.fractions.single.percentage};
`;

export const EndpointActivityLog = memo(
  ({ activityLog }: { activityLog: AsyncResourceState<Immutable<ActivityLog>> }) => {
    const activityLogUninitialized = useEndpointSelector(getActivityLogUninitialized);
    const activityLogLoading = useEndpointSelector(getActivityLogRequestLoading);
    const activityLogLoaded = useEndpointSelector(getActivityLogRequestLoaded);
    const activityLastLogData = useEndpointSelector(getLastLoadedActivityLogData);
    const activityLogData = useEndpointSelector(getActivityLogIterableData);
    const activityLogSize = activityLogData.length;
    const activityLogError = useEndpointSelector(getActivityLogError);
    const dispatch = useDispatch<(action: EndpointAction) => void>();
    const {
      page,
      pageSize,
      startDate,
      endDate,
      disabled: isPagingDisabled,
    } = useEndpointSelector(getActivityLogDataPaging);

    const hasActiveDateRange = useMemo(() => !!startDate || !!endDate, [startDate, endDate]);
    const showEmptyState = useMemo(
      () => (activityLogLoaded && !activityLogSize && !hasActiveDateRange) || activityLogError,
      [activityLogLoaded, activityLogSize, hasActiveDateRange, activityLogError]
    );
    const isShorter = useMemo(
      () => !!(hasActiveDateRange && isPagingDisabled && !activityLogLoading && !activityLogSize),
      [hasActiveDateRange, isPagingDisabled, activityLogLoading, activityLogSize]
    );

    const doesNotHaveDataAlsoOnRefetch = useMemo(
      () => !activityLastLogData?.data.length && !activityLogData.length,
      [activityLastLogData, activityLogData]
    );

    const showCallout = useMemo(
      () =>
        (!isPagingDisabled && activityLogLoaded && !activityLogData.length) ||
        doesNotHaveDataAlsoOnRefetch,
      [isPagingDisabled, activityLogLoaded, activityLogData, doesNotHaveDataAlsoOnRefetch]
    );

    const loadMoreTrigger = useRef<HTMLInputElement | null>(null);
    const getActivityLog = useCallback(
      (entries: IntersectionObserverEntry[]) => {
        const isTargetIntersecting = entries.some((entry) => entry.isIntersecting);
        if (isTargetIntersecting && activityLogLoaded && !isPagingDisabled) {
          dispatch({
            type: 'endpointDetailsActivityLogUpdatePaging',
            payload: {
              page: page + 1,
              pageSize,
              startDate,
              endDate,
            },
          });
        }
      },
      [activityLogLoaded, dispatch, isPagingDisabled, page, pageSize, startDate, endDate]
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
        <StyledEuiFlexGroup direction="column" responsive={false} isShorter={isShorter}>
          {(activityLogLoading && !activityLastLogData?.data.length) || activityLogUninitialized ? (
            <EuiLoadingContent lines={3} />
          ) : showEmptyState ? (
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
              <DateRangePicker />
              <EuiFlexItem grow={true}>
                {showCallout && (
                  <>
                    <EuiSpacer size="m" />
                    <EuiCallOut
                      data-test-subj="activityLogNoDataCallout"
                      size="s"
                      title={i18.ACTIVITY_LOG.LogEntry.dateRangeMessage}
                      iconType="alert"
                    />
                  </>
                )}
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
                {(!activityLogLoading || !isPagingDisabled) && !showCallout && (
                  <LoadMoreTrigger
                    data-test-subj="activityLogLoadMoreTrigger"
                    ref={loadMoreTrigger}
                  />
                )}
                {isPagingDisabled && !activityLogLoading && !showCallout && (
                  <EuiText color="subdued" textAlign="center">
                    <p>{i18.ACTIVITY_LOG.LogEntry.endOfLog}</p>
                  </EuiText>
                )}
              </EuiFlexItem>
            </>
          )}
        </StyledEuiFlexGroup>
      </>
    );
  }
);

EndpointActivityLog.displayName = 'EndpointActivityLog';
