/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback, memo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { i18n } from '@kbn/i18n';
import { EuiPopover, EuiPopoverTitle, EuiSuperDatePicker } from '@elastic/eui';
import type { ShortDate, EuiSuperDatePickerProps } from '@elastic/eui';
import { formatDate } from '../../../common/components/super_date_picker';
import { StyledEuiButtonIcon } from './styles';
import { useColors } from '../use_colors';
import * as selectors from '../../store/selectors';
import { userOverrodeDateRange } from '../../store/data/action';
import type { State } from '../../../common/store/types';

interface DurationRange {
  end: ShortDate;
  label?: string;
  start: ShortDate;
}

const emptyRanges: DurationRange[] = [];

const nodeLegendButtonTitle = i18n.translate(
  'xpack.securitySolution.resolver.graphControls.datePickerButtonTitle',
  {
    defaultMessage: 'Date Range Selection',
  }
);

const dateRangeDescription = i18n.translate(
  'xpack.securitySolution.resolver.graphControls.datePicker',
  {
    defaultMessage: 'date range selection',
  }
);

export const DateSelectionButton = memo(
  ({
    id,
    closePopover,
    setActivePopover,
    isOpen,
  }: {
    id: string;
    closePopover: () => void;
    setActivePopover: (value: 'datePicker') => void;
    isOpen: boolean;
  }) => {
    const dispatch = useDispatch();
    const setAsActivePopover = useCallback(
      () => setActivePopover('datePicker'),
      [setActivePopover]
    );
    const colorMap = useColors();

    const appliedBounds = useSelector((state: State) => {
      return selectors.currentAppliedTimeRange(state.analyzer[id]);
    });

    const onTimeChange = useCallback<EuiSuperDatePickerProps['onTimeChange']>(
      ({ start, end, isInvalid }) => {
        if (!isInvalid) {
          const isQuickSelection = start.includes('now') || end.includes('now');
          const fromDate = formatDate(start);
          let toDate = formatDate(end, { roundUp: true });
          if (isQuickSelection) {
            if (start === end) {
              toDate = formatDate('now');
            } else {
              toDate = formatDate(end);
            }
          }
          dispatch(userOverrodeDateRange({ id, timeRange: { from: fromDate, to: toDate } }));
        }
      },
      [dispatch, id]
    );

    return (
      <EuiPopover
        button={
          <StyledEuiButtonIcon
            data-test-subj="resolver:graph-controls:date-picker-button"
            size="m"
            title={nodeLegendButtonTitle}
            aria-label={nodeLegendButtonTitle}
            onClick={setAsActivePopover}
            iconType="calendar"
            $backgroundColor={colorMap.graphControlsBackground}
            $iconColor={colorMap.graphControls}
            $borderColor={colorMap.graphControlsBorderColor}
          />
        }
        isOpen={isOpen}
        closePopover={closePopover}
        anchorPosition="leftCenter"
      >
        <EuiPopoverTitle style={{ textTransform: 'uppercase' }}>
          {dateRangeDescription}
        </EuiPopoverTitle>
        <EuiSuperDatePicker
          onTimeChange={onTimeChange}
          start={appliedBounds?.from}
          end={appliedBounds?.to}
          showUpdateButton={false}
          recentlyUsedRanges={emptyRanges}
          width="auto"
        />
      </EuiPopover>
    );
  }
);

DateSelectionButton.displayName = 'DateSelectionButton';
