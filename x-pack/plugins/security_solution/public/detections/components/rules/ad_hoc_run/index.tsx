/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import dateMath from '@kbn/datemath';

import type { OnTimeChangeProps } from '@elastic/eui';
import {
  EuiButton,
  EuiCheckbox,
  EuiFlexGroup,
  EuiFlexItem,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiSpacer,
  EuiSuperDatePicker,
} from '@elastic/eui';
import type { RuleAction } from '@kbn/alerting-plugin/common';
import { useAdHocRun } from '../../../../detection_engine/rule_management/logic/use_ad_hoc_run';
import { getAllActionMessageParams } from '../../../pages/detection_engine/rules/helpers';
import * as i18n from './translations';
import { AdHocRuleActions } from './actions';

const timeRanges = [
  { start: 'now/d', end: 'now', label: 'Today' },
  { start: 'now/w', end: 'now', label: 'This week' },
  { start: 'now-15m', end: 'now', label: 'Last 15 minutes' },
  { start: 'now-30m', end: 'now', label: 'Last 30 minutes' },
  { start: 'now-1h', end: 'now', label: 'Last 1 hour' },
  { start: 'now-24h', end: 'now', label: 'Last 24 hours' },
  { start: 'now-7d', end: 'now', label: 'Last 7 days' },
  { start: 'now-30d', end: 'now', label: 'Last 30 days' },
];

export interface AdHocRunModalProps {
  ruleId: string;
  closeModal: () => void;
}

const refreshedTimeframe = (startDate: string, endDate: string) => {
  return {
    start: dateMath.parse(startDate) || moment().subtract(1, 'hour'),
    end: dateMath.parse(endDate) || moment(),
  };
};

const AdHocRunModalComponent: React.FC<AdHocRunModalProps> = ({ ruleId, closeModal }) => {
  // Raw timeframe as a string
  const [startDate, setStartDate] = useState('now-1h');
  const [endDate, setEndDate] = useState('now');

  // Parsed timeframe as a Moment object
  const [timeframeStart, setTimeframeStart] = useState(moment().subtract(1, 'hour'));
  const [timeframeEnd, setTimeframeEnd] = useState(moment());

  const [isDateRangeInvalid, setIsDateRangeInvalid] = useState(false);
  const [isAdHocActionsEnabled, setIsAdHocActionsEnabled] = useState(false);

  const [actions, setActions] = useState<RuleAction[]>([]);
  const messageVariables = useMemo(() => getAllActionMessageParams(), []);

  const { adHocRun: ruleAdHocRun } = useAdHocRun({
    id: ruleId,
    timeframeStart,
    timeframeEnd,
    actions: isAdHocActionsEnabled ? actions : undefined,
  });

  const updateAndHocActionsCheckbox = useCallback(() => {
    setIsAdHocActionsEnabled(!isAdHocActionsEnabled);
  }, [isAdHocActionsEnabled]);

  useEffect(() => {
    const { start, end } = refreshedTimeframe(startDate, endDate);
    setTimeframeStart(start);
    setTimeframeEnd(end);
  }, [startDate, endDate]);

  useEffect(() => {
    const { start, end } = refreshedTimeframe(startDate, endDate);
    setTimeframeStart(start);
    setTimeframeEnd(end);
  }, [endDate, startDate]);

  const onTimeChange = useCallback(
    ({ start: newStart, end: newEnd, isInvalid }: OnTimeChangeProps) => {
      setIsDateRangeInvalid(isInvalid);
      if (!isInvalid) {
        setStartDate(newStart);
        setEndDate(newEnd);
      }
    },
    []
  );

  const onTimeframeRefresh = useCallback(() => {
    const { start, end } = refreshedTimeframe(startDate, endDate);
    setTimeframeStart(start);
    setTimeframeEnd(end);
  }, [endDate, startDate]);

  const runAndClose = useCallback(() => {
    ruleAdHocRun();
    closeModal();
  }, [closeModal, ruleAdHocRun]);

  return (
    <EuiModal onClose={closeModal}>
      <EuiModalHeader>
        <EuiModalHeaderTitle>{i18n.AD_HOC_RUN_TITLE}</EuiModalHeaderTitle>
      </EuiModalHeader>

      <EuiModalBody>
        {i18n.AD_HOC_RUN_DESCRIPTION}
        <EuiSpacer />
        <EuiFlexGroup alignItems="center" responsive={false} gutterSize="s">
          <EuiSuperDatePicker
            start={startDate}
            end={endDate}
            onTimeChange={onTimeChange}
            showUpdateButton={false}
            commonlyUsedRanges={timeRanges}
            onRefresh={onTimeframeRefresh}
            data-test-subj="ad-hoc-run-time-frame"
          />
        </EuiFlexGroup>
        <EuiSpacer />
        <EuiFlexGroup alignItems="center" gutterSize="s" onClick={updateAndHocActionsCheckbox}>
          <EuiFlexItem grow={false}>
            <EuiCheckbox
              id={'ad-hoc-actions-checkbox'}
              checked={isAdHocActionsEnabled}
              onChange={updateAndHocActionsCheckbox}
            />
          </EuiFlexItem>
          <EuiFlexItem>{i18n.AD_HOC_ACTIONS_CHECKBOX_TITLE}</EuiFlexItem>
        </EuiFlexGroup>
        {isAdHocActionsEnabled && (
          <>
            <EuiSpacer />
            <AdHocRuleActions
              actions={actions}
              updateActions={setActions}
              messageVariables={messageVariables}
              summaryMessageVariables={messageVariables}
            />
          </>
        )}
      </EuiModalBody>

      <EuiModalFooter>
        <EuiButton onClick={closeModal}>{i18n.AD_HOC_RUN_CANCEL_BUTTON}</EuiButton>
        <EuiButton fill isDisabled={isDateRangeInvalid} onClick={runAndClose}>
          {i18n.AD_HOC_RUN_CONFIRM_BUTTON}
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
};

export const AdHocRunModal = React.memo(AdHocRunModalComponent);
