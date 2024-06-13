/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  EuiBetaBadge,
  EuiConfirmModal,
  EuiDatePicker,
  EuiDatePickerRange,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormRow,
  EuiHorizontalRule,
  EuiSpacer,
  useGeneratedHtmlId,
} from '@elastic/eui';
import moment from 'moment';
import React, { useCallback, useMemo, useState } from 'react';
import { TECHNICAL_PREVIEW, TECHNICAL_PREVIEW_TOOLTIP } from '../../../../common/translations';

import * as i18n from './translations';

export const MAX_SCHEDULE_BACKFILL_LOOKBACK_WINDOW_DAYS = 90;

interface ManualRuleRunModalProps {
  onCancel: () => void;
  onConfirm: (timeRange: { startDate: moment.Moment; endDate: moment.Moment }) => void;
}

const ManualRuleRunModalComponent = ({ onCancel, onConfirm }: ManualRuleRunModalProps) => {
  const modalTitleId = useGeneratedHtmlId();

  const now = moment();

  // By default we show three hours time range which user can then adjust
  const [startDate, setStartDate] = useState(now.clone().subtract(3, 'h'));
  const [endDate, setEndDate] = useState(now.clone());

  const isStartDateOutOfRange = now
    .clone()
    .subtract(MAX_SCHEDULE_BACKFILL_LOOKBACK_WINDOW_DAYS, 'd')
    .isAfter(startDate);
  const isEndDateInFuture = endDate.isAfter(now);
  const isInvalidTimeRange = startDate.isSameOrAfter(endDate);
  const isInvalid = isStartDateOutOfRange || isEndDateInFuture || isInvalidTimeRange;
  const errorMessage = useMemo(() => {
    if (isStartDateOutOfRange) {
      return i18n.MANUAL_RULE_RUN_START_DATE_OUT_OF_RANGE_ERROR(
        MAX_SCHEDULE_BACKFILL_LOOKBACK_WINDOW_DAYS
      );
    }
    if (isEndDateInFuture) {
      return i18n.MANUAL_RULE_RUN_FUTURE_TIME_RANGE_ERROR;
    }
    if (isInvalidTimeRange) {
      return i18n.MANUAL_RULE_RUN_INVALID_TIME_RANGE_ERROR;
    }
    return null;
  }, [isEndDateInFuture, isInvalidTimeRange, isStartDateOutOfRange]);

  const handleConfirm = useCallback(() => {
    onConfirm({ startDate, endDate });
  }, [endDate, onConfirm, startDate]);

  return (
    <EuiConfirmModal
      aria-labelledby={modalTitleId}
      titleProps={{ id: modalTitleId }}
      onCancel={onCancel}
      onConfirm={handleConfirm}
      confirmButtonText={i18n.MANUAL_RULE_RUN_CONFIRM_BUTTON}
      cancelButtonText={i18n.MANUAL_RULE_RUN_CANCEL_BUTTON}
      confirmButtonDisabled={isInvalid}
    >
      <EuiForm data-test-subj="manual-rule-run-modal-form">
        <EuiSpacer size="m" />
        <EuiFormRow
          data-test-subj="manual-rule-run-time-range-form"
          label={
            <EuiFlexGroup>
              <EuiFlexItem>{i18n.MANUAL_RULE_RUN_TIME_RANGE_TITLE}</EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiBetaBadge
                  label={TECHNICAL_PREVIEW}
                  tooltipContent={TECHNICAL_PREVIEW_TOOLTIP}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          }
          isInvalid={isInvalid}
          error={errorMessage}
        >
          <EuiDatePickerRange
            data-test-subj="manual-rule-run-time-range"
            readOnly={true}
            startDateControl={
              <EuiDatePicker
                aria-label="Start date range"
                selected={startDate}
                onChange={(date) => date && setStartDate(date)}
                startDate={startDate}
                endDate={endDate}
                showTimeSelect={true}
              />
            }
            endDateControl={
              <EuiDatePicker
                aria-label="End date range"
                selected={endDate}
                onChange={(date) => date && setEndDate(date)}
                startDate={startDate}
                endDate={endDate}
                showTimeSelect={true}
              />
            }
          />
        </EuiFormRow>
        <EuiHorizontalRule />
        <EuiFormRow data-test-subj="start-date-picker" label={i18n.MANUAL_RULE_RUN_START_AT_TITLE}>
          <EuiDatePicker
            aria-label="Start date picker"
            inline
            selected={startDate}
            onChange={(date) => date && setStartDate(date)}
            startDate={startDate}
            endDate={endDate}
            showTimeSelect={true}
          />
        </EuiFormRow>
        <EuiHorizontalRule />
        <EuiFormRow data-test-subj="end-date-picker" label={i18n.MANUAL_RULE_RUN_END_AT_TITLE}>
          <EuiDatePicker
            aria-label="End date picker"
            inline
            selected={endDate}
            onChange={(date) => date && setEndDate(date)}
            startDate={startDate}
            endDate={endDate}
            showTimeSelect={true}
          />
        </EuiFormRow>
      </EuiForm>
    </EuiConfirmModal>
  );
};

export const ManualRuleRunModal = React.memo(ManualRuleRunModalComponent);
ManualRuleRunModal.displayName = 'ManualRuleRunModal';
