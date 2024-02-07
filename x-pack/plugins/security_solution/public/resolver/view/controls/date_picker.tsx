/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { i18n } from '@kbn/i18n';
import { EuiPopover, EuiPopoverTitle, EuiSuperDatePicker } from '@elastic/eui';
import { StyledEuiButtonIcon } from './styles';
import { useColors } from '../use_colors';
import * as selectors from '../../store/selectors';
import { userOverrodeDateRange } from '../../store/data/action';
import type { State } from '../../../common/store/types';

export const DateSelectionButton = ({
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
  const setAsActivePopover = useCallback(() => setActivePopover('datePicker'), [setActivePopover]);
  const colorMap = useColors();

  const appliedBounds = useSelector((state: State) => {
    return selectors.currentAppliedTimeRange(state.analyzer[id]);
  });

  const nodeLegendButtonTitle = i18n.translate(
    'xpack.securitySolution.resolver.graphControls.datePickerButtonTitle',
    {
      defaultMessage: 'Date Range Selection',
    }
  );

  const onTimeChange = useCallback(
    ({ start, end, isInvalid }) => {
      if (!isInvalid) {
        dispatch(userOverrodeDateRange({ id, timeRange: { from: start, to: end } }));
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
        {i18n.translate('xpack.securitySolution.resolver.graphControls.datePicker', {
          defaultMessage: 'date range selection',
        })}
      </EuiPopoverTitle>
      <EuiSuperDatePicker
        onTimeChange={onTimeChange}
        start={appliedBounds?.from}
        end={appliedBounds?.to}
        showUpdateButton={false}
        width="auto"
      />
    </EuiPopover>
  );
};
