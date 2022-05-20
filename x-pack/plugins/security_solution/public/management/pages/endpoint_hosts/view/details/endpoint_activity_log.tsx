/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
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

import { useGetActivityLog } from '../../../../services/activity_log';
import { LogEntry } from './components/log_entry';
import { DateRangePicker } from './components/activity_log_date_range_picker';
import * as i18 from '../translations';
import { getActivityLogDataPaging } from '../../store/selectors';
import { useEndpointSelector } from '../hooks';

const StyledEuiFlexGroup = styled(EuiFlexGroup)<{ isShorter: boolean }>`
  height: ${({ isShorter }) => (isShorter ? '25vh' : '85vh')};
`;
const LoadMoreTrigger = styled.div`
  height: ${(props) => props.theme.eui.euiSizeXS};
  width: ${(props) => props.theme.eui.fractions.single.percentage};
`;

export const EndpointActivityLog = memo(({ agentId }: { agentId: string }) => {
  const [page, setPage] = useState(1);
  const [isPagingDisabled, setIsPagingDisabled] = useState(false);
  const { startDate, endDate } = useEndpointSelector(getActivityLogDataPaging);

  const {
    data: activityLogData,
    isError,
    isFetching,
    isPreviousData,
  } = useGetActivityLog({ agentId, options: { page, pageSize: 50, startDate, endDate } });

  const activityLogSize = useMemo(() => activityLogData?.data.length, [activityLogData]);

  const hasActiveDateRange = useMemo(
    () => !!activityLogData && (!!activityLogData.startDate || !!activityLogData.endDate),
    [activityLogData]
  );

  const showEmptyState = useMemo(
    () => (!isFetching && !activityLogSize && !hasActiveDateRange) || isError,
    [isFetching, activityLogSize, hasActiveDateRange, isError]
  );
  const isShorter = useMemo(
    () => !!(hasActiveDateRange && isPagingDisabled && !isFetching && !activityLogSize),
    [hasActiveDateRange, isPagingDisabled, isFetching, activityLogSize]
  );

  const doesNotHaveDataAlsoOnRefetch = useMemo(() => !activityLogSize, [activityLogSize]);

  const showCallout = useMemo(
    () => (!isPagingDisabled && !isFetching && !activityLogSize) || doesNotHaveDataAlsoOnRefetch,
    [isPagingDisabled, isFetching, activityLogSize, doesNotHaveDataAlsoOnRefetch]
  );

  const loadMoreTrigger = useRef<HTMLInputElement | null>(null);
  const getActivityLogPaged = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const isTargetIntersecting = entries.some((entry) => entry.isIntersecting);
      if (isTargetIntersecting && !isFetching) {
        if (!isPagingDisabled && !isPreviousData) {
          setPage((p) => p + 1);
        }
      }
      setIsPagingDisabled(true);
      setPage((p) => (p > 2 ? p - 1 : p));
    },
    [isFetching, isPagingDisabled, isPreviousData]
  );

  useEffect(() => {
    const observer = new IntersectionObserver(getActivityLogPaged);
    const element = loadMoreTrigger.current;
    if (element) {
      observer.observe(element);
    }
    return () => {
      observer.disconnect();
    };
  }, [getActivityLogPaged]);

  return (
    <>
      <StyledEuiFlexGroup direction="column" responsive={false} isShorter={isShorter}>
        {(isFetching && !activityLogSize) || !activityLogData ? (
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
            <DateRangePicker isLoading={isFetching} />
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
              {!isFetching &&
                activityLogData &&
                activityLogData.data.map((logEntry) => (
                  <LogEntry key={`${logEntry.item.id}`} logEntry={logEntry} />
                ))}
              {isPreviousData &&
                activityLogData &&
                activityLogData.data.map((logEntry) => (
                  <LogEntry key={`${logEntry.item.id}`} logEntry={logEntry} />
                ))}
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              {isFetching && <EuiLoadingContent lines={3} />}
              {(!isFetching || !isPagingDisabled) && !showCallout && (
                <LoadMoreTrigger
                  data-test-subj="activityLogLoadMoreTrigger"
                  ref={loadMoreTrigger}
                />
              )}
              {isPagingDisabled && !isFetching && !showCallout && (
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
});

EndpointActivityLog.displayName = 'EndpointActivityLog';
