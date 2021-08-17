/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useDispatch } from 'react-redux';
import React, { memo, useCallback } from 'react';
import styled from 'styled-components';
import moment from 'moment';
import { EuiFlexGroup, EuiFlexItem, EuiDatePicker, EuiDatePickerRange } from '@elastic/eui';

import * as i18 from '../../../translations';
import { useEndpointSelector } from '../../../hooks';
import { getActivityLogDataPaging } from '../../../../store/selectors';

const DatePickerWrapper = styled.div`
  width: ${(props) => props.theme.eui.fractions.single.percentage};
  background: white;
`;
const StickyFlexItem = styled(EuiFlexItem)`
  max-width: 350px;
  position: sticky;
  top: ${(props) => props.theme.eui.euiSizeM};
  z-index: 1;
  padding: ${(props) => `0 ${props.theme.eui.paddingSizes.m}`};
`;

export const DateRangePicker = memo(() => {
  const dispatch = useDispatch();
  const { page, pageSize, startDate, endDate, isInvalidDateRange } = useEndpointSelector(
    getActivityLogDataPaging
  );

  const onClear = useCallback(
    ({ clearStart = false, clearEnd = false }: { clearStart?: boolean; clearEnd?: boolean }) => {
      dispatch({
        type: 'endpointDetailsActivityLogUpdatePaging',
        payload: {
          disabled: false,
          page,
          pageSize,
          startDate: clearStart ? undefined : startDate,
          endDate: clearEnd ? undefined : endDate,
        },
      });
    },
    [dispatch, endDate, startDate, page, pageSize]
  );

  const onChangeStartDate = useCallback(
    (date) => {
      dispatch({
        type: 'endpointDetailsActivityLogUpdatePaging',
        payload: {
          disabled: false,
          page,
          pageSize,
          startDate: date ? date?.toISOString() : undefined,
          endDate: endDate ? endDate : undefined,
        },
      });
    },
    [dispatch, endDate, page, pageSize]
  );

  const onChangeEndDate = useCallback(
    (date) => {
      dispatch({
        type: 'endpointDetailsActivityLogUpdatePaging',
        payload: {
          disabled: false,
          page,
          pageSize,
          startDate: startDate ? startDate : undefined,
          endDate: date ? date.toISOString() : undefined,
        },
      });
    },
    [dispatch, startDate, page, pageSize]
  );

  return (
    <StickyFlexItem grow={false}>
      <EuiFlexGroup justifyContent="flexEnd" responsive>
        <DatePickerWrapper>
          <EuiFlexItem>
            <EuiDatePickerRange
              fullWidth={true}
              data-test-subj="activityLogDateRangePicker"
              startDateControl={
                <EuiDatePicker
                  aria-label="Start date"
                  endDate={endDate ? moment(endDate) : undefined}
                  isInvalid={isInvalidDateRange}
                  maxDate={moment(endDate) || moment()}
                  onChange={onChangeStartDate}
                  onClear={() => onClear({ clearStart: true })}
                  placeholderText={i18.ACTIVITY_LOG.datePicker.startDate}
                  selected={startDate ? moment(startDate) : undefined}
                  showTimeSelect
                  startDate={startDate ? moment(startDate) : undefined}
                />
              }
              endDateControl={
                <EuiDatePicker
                  aria-label="End date"
                  endDate={endDate ? moment(endDate) : undefined}
                  isInvalid={isInvalidDateRange}
                  maxDate={moment()}
                  minDate={startDate ? moment(startDate) : undefined}
                  onChange={onChangeEndDate}
                  onClear={() => onClear({ clearEnd: true })}
                  placeholderText={i18.ACTIVITY_LOG.datePicker.endDate}
                  selected={endDate ? moment(endDate) : undefined}
                  showTimeSelect
                  startDate={startDate ? moment(startDate) : undefined}
                />
              }
            />
          </EuiFlexItem>
        </DatePickerWrapper>
      </EuiFlexGroup>
    </StickyFlexItem>
  );
});

DateRangePicker.displayName = 'DateRangePicker';
