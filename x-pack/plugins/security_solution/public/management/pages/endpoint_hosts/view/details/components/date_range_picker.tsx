/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useDispatch } from 'react-redux';
import React, { memo, useCallback, useEffect, useState } from 'react';
import styled from 'styled-components';
import moment, { Moment } from 'moment';
import { EuiFlexGroup, EuiFlexItem, EuiDatePicker, EuiDatePickerRange } from '@elastic/eui';

import * as i18 from '../../translations';
import { useEndpointSelector } from '../../hooks';
import { getActivityLogDataPaging, selectedAgent } from '../../../store/selectors';

const DatePickerWrapper = styled.div`
  width: ${(props) => props.theme.eui.fractions.single.percentage};
  background: white;
`;
const StickyFlexItem = styled(EuiFlexItem)`
  position: sticky;
  top: ${(props) => props.theme.eui.euiSizeM};
  z-index: 1;
`;

export const DateRangePicker = memo(() => {
  // clear dates on endpoint selection
  const elasticAgentId = useEndpointSelector(selectedAgent);
  useEffect(() => {
    return () => {
      if (elasticAgentId) {
        setStartDate(undefined);
        setEndDate(undefined);
      }
    };
  }, [elasticAgentId]);

  const dispatch = useDispatch();
  const {
    page,
    pageSize,
    startDate: initialStartDate,
    endDate: initialEndDate,
  } = useEndpointSelector(getActivityLogDataPaging);
  const [startDate, setStartDate] = useState<Moment | undefined>(
    initialStartDate ? moment(initialStartDate) : undefined
  );
  const [endDate, setEndDate] = useState<Moment | undefined>(
    initialEndDate ? moment(initialEndDate) : undefined
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
          startDate: startDate ? startDate.toISOString() : undefined,
          endDate: date ? date.toISOString() : undefined,
        },
      });
    },
    [dispatch, startDate, page, pageSize]
  );
  const isInvalidDateRange = startDate && endDate ? startDate > endDate : false;
  return (
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
                  onClear={() => onChangeStartDate(undefined)}
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
                  onClear={() => onChangeEndDate(undefined)}
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
  );
});

DateRangePicker.displayName = 'DateRangePicker';
