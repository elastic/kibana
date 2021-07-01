/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import moment, { Moment } from 'moment';

import {
  EuiText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingContent,
  EuiEmptyPrompt,
  EuiDatePicker,
  EuiDatePickerRange,
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

const StyledEuiFlexGroup = styled(EuiFlexGroup)`
  height: 85vh;
`;
const LoadMoreTrigger = styled.div`
  height: ${(props) => props.theme.eui.euiSizeXS};
  width: ${(props) => props.theme.eui.fractions.single.percentage};
`;

const DatePickerWrapper = styled.div`
  width: ${(props) => props.theme.eui.fractions.single.percentage};
  background: white;
`;
const StickyFlexItem = styled(EuiFlexItem)`
  position: sticky;
  top: ${(props) => props.theme.eui.euiSizeM};
  z-index: 1;
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
    const {
      page,
      pageSize,
      startDate: initialStartDate,
      endDate: initialEndDate,
      disabled: isPagingDisabled,
    } = useEndpointSelector(getActivityLogDataPaging);

    const [startDate, setStartDate] = useState<Moment | null>(
      initialStartDate ? moment(initialStartDate) : null
    );
    const [endDate, setEndDate] = useState<Moment | null>(
      initialEndDate ? moment(initialEndDate) : null
    );
    const isInvalidDateRange = startDate !== null && endDate !== null ? startDate > endDate : false;

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
              startDate: startDate?.toISOString(),
              endDate: endDate?.toISOString(),
            },
          });
        }
      },
      [activityLogLoaded, dispatch, isPagingDisabled, page, pageSize, startDate, endDate]
    );

    const onChangeStartDate = useCallback(
      (date) => {
        setStartDate(date);
        dispatch({
          type: 'endpointDetailsActivityLogUpdatePaging',
          payload: {
            disabled: false,
            page,
            pageSize,
            startDate: date ? date?.toISOString() : undefined,
          },
        });
        dispatch({
          type: 'appRequestedEndpointActivityLog',
          payload: {
            page,
            pageSize,
            startDate: date ? date.toISOString() : undefined,
            endDate: endDate ? endDate.toISOString() : undefined,
          },
        });
      },
      [dispatch, endDate, page, pageSize]
    );

    const onChangeEndDate = useCallback(
      (date) => {
        setEndDate(date);
        dispatch({
          type: 'endpointDetailsActivityLogUpdatePaging',
          payload: {
            disabled: false,
            page,
            pageSize,
            endDate: date ? date.toISOString() : undefined,
          },
        });
        dispatch({
          type: 'appRequestedEndpointActivityLog',
          payload: {
            page,
            pageSize,
            startDate: startDate ? startDate.toISOString() : undefined,
            endDate: date ? date.toISOString() : undefined,
          },
        });
      },
      [dispatch, startDate, page, pageSize]
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
        <StyledEuiFlexGroup direction="column" responsive={false}>
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
              <StickyFlexItem grow={false}>
                <EuiFlexGroup justifyContent="flexEnd" responsive>
                  <DatePickerWrapper>
                    <EuiFlexItem>
                      <EuiDatePickerRange
                        startDateControl={
                          <EuiDatePicker
                            aria-label="Start date"
                            endDate={endDate}
                            isInvalid={isInvalidDateRange}
                            onChange={onChangeStartDate}
                            onClear={() => onChangeStartDate(null)}
                            placeholderText={i18.ACTIVITY_LOG.datePicker.startDate}
                            selected={startDate}
                            showTimeSelect
                            startDate={startDate}
                          />
                        }
                        endDateControl={
                          <EuiDatePicker
                            aria-label="End date"
                            endDate={endDate}
                            isInvalid={isInvalidDateRange}
                            onChange={onChangeEndDate}
                            onClear={() => onChangeEndDate(null)}
                            placeholderText={i18.ACTIVITY_LOG.datePicker.endDate}
                            selected={endDate}
                            showTimeSelect
                            startDate={startDate}
                          />
                        }
                      />
                    </EuiFlexItem>
                  </DatePickerWrapper>
                </EuiFlexGroup>
              </StickyFlexItem>
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
        </StyledEuiFlexGroup>
      </>
    );
  }
);

EndpointActivityLog.displayName = 'EndpointActivityLog';
