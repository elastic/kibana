/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import dateMath from '@kbn/datemath';
import type { Unit } from '@kbn/datemath';
import type { ThreatMapping, Type } from '@kbn/securitysolution-io-ts-alerting-types';
import styled from 'styled-components';
import type { DataViewBase } from '@kbn/es-query';
import type { EuiButtonGroupOptionProps, OnTimeChangeProps } from '@elastic/eui';
import {
  EuiButtonGroup,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSelect,
  EuiFormRow,
  EuiButton,
  EuiSpacer,
  EuiSuperDatePicker,
} from '@elastic/eui';
import moment from 'moment';
import { useSecurityJobs } from '../../../../common/components/ml_popover/hooks/use_security_jobs';
import type { FieldValueQueryBar } from '../query_bar';
import * as i18n from './translations';
import { usePreviewRoute } from './use_preview_route';
import { PreviewHistogram } from './preview_histogram';
import { getTimeframeOptions } from './helpers';
import { PreviewLogsComponent } from './preview_logs';
import { useKibana } from '../../../../common/lib/kibana';
import { LoadingHistogram } from './loading_histogram';
import type { FieldValueThreshold } from '../threshold_input';
import { isJobStarted } from '../../../../../common/machine_learning/helpers';
import type { EqlOptionsSelected } from '../../../../../common/search_strategy';
import { useStartTransaction } from '../../../../common/lib/apm/use_start_transaction';
import { SINGLE_RULE_ACTIONS } from '../../../../common/lib/apm/user_actions';
import { Form, UseField, useForm, useFormData } from '../../../../shared_imports';
import { ScheduleItem } from '../schedule_item_form';
import type {
  AdvancedPreviewForm,
  DataSourceType,
} from '../../../pages/detection_engine/rules/types';
import { schema } from './schema';

const HelpTextComponent = (
  <EuiFlexGroup direction="column" gutterSize="none">
    <EuiFlexItem>{i18n.QUERY_PREVIEW_HELP_TEXT}</EuiFlexItem>
    <EuiFlexItem>{i18n.QUERY_PREVIEW_DISCLAIMER}</EuiFlexItem>
  </EuiFlexGroup>
);

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

const QUICK_QUERY_SELECT_ID = 'quickQuery';
const ADVANCED_QUERY_SELECT_ID = 'advancedQuery';

const advancedOptionsDefaultValue = {
  interval: '5m',
  lookback: '1m',
};

export interface RulePreviewProps {
  index: string[];
  indexPattern: DataViewBase;
  isDisabled: boolean;
  query: FieldValueQueryBar;
  dataViewId?: string;
  dataSourceType: DataSourceType;
  ruleType: Type;
  threatIndex: string[];
  threatMapping: ThreatMapping;
  threatQuery: FieldValueQueryBar;
  threshold: FieldValueThreshold;
  machineLearningJobId: string[];
  anomalyThreshold: number;
  eqlOptions: EqlOptionsSelected;
  newTermsFields: string[];
  historyWindowSize: string;
}

const Select = styled(EuiSelect)`
  width: ${({ theme }) => theme.eui.euiSuperDatePickerWidth};
`;

const PreviewButton = styled(EuiButton)`
  margin-left: 0;
`;

const defaultTimeRange: Unit = 'h';

const refreshedTimeframe = (startDate: string, endDate: string) => {
  return {
    start: dateMath.parse(startDate) || moment().subtract(1, 'hour'),
    end: dateMath.parse(endDate) || moment(),
  };
};

const RulePreviewComponent: React.FC<RulePreviewProps> = ({
  index,
  indexPattern,
  dataViewId,
  dataSourceType,
  isDisabled,
  query,
  ruleType,
  threatIndex,
  threatQuery,
  threatMapping,
  threshold,
  machineLearningJobId,
  anomalyThreshold,
  eqlOptions,
  newTermsFields,
  historyWindowSize,
}) => {
  const { spaces } = useKibana().services;
  const { loading: isMlLoading, jobs } = useSecurityJobs(false);

  const [spaceId, setSpaceId] = useState('');
  useEffect(() => {
    if (spaces) {
      spaces.getActiveSpace().then((space) => setSpaceId(space.id));
    }
  }, [spaces]);

  // Raw timeframe as a string
  const [startDate, setStartDate] = useState('now-1h');
  const [endDate, setEndDate] = useState('now');

  // Parsed timeframe as a Moment object
  const [timeframeStart, setTimeframeStart] = useState(moment().subtract(1, 'hour'));
  const [timeframeEnd, setTimeframeEnd] = useState(moment());

  useEffect(() => {
    const { start, end } = refreshedTimeframe(startDate, endDate);
    setTimeframeStart(start);
    setTimeframeEnd(end);
  }, [startDate, endDate]);

  const { form } = useForm<AdvancedPreviewForm>({
    defaultValue: advancedOptionsDefaultValue,
    options: { stripEmptyFields: false },
    schema,
  });

  const [{ interval: formInterval, lookback: formLookback }] = useFormData<AdvancedPreviewForm>({
    form,
    watch: ['interval', 'lookback'],
  });

  const areRelaventMlJobsRunning = useMemo(() => {
    if (ruleType !== 'machine_learning') {
      return true; // Don't do the expensive logic if we don't need it
    }
    if (isMlLoading) {
      return false;
    }
    const selectedJobs = jobs.filter(({ id }) => machineLearningJobId.includes(id));
    return selectedJobs.every((job) => isJobStarted(job.jobState, job.datafeedState));
  }, [jobs, machineLearningJobId, ruleType, isMlLoading]);

  const [queryPreviewIdSelected, setQueryPreviewRadioIdSelected] = useState(QUICK_QUERY_SELECT_ID);

  // Callback for when user toggles between Quick query and Advanced query preview
  const onChangeDataSource = (optionId: string) => {
    setQueryPreviewRadioIdSelected(optionId);
  };

  const quickAdvancedToggleButtonOptions: EuiButtonGroupOptionProps[] = useMemo(
    () => [
      {
        id: QUICK_QUERY_SELECT_ID,
        label: i18n.QUICK_PREVIEW_TOGGLE_BUTTON,
        'data-test-subj': `rule-preview-toggle-${QUICK_QUERY_SELECT_ID}`,
      },
      {
        id: ADVANCED_QUERY_SELECT_ID,
        label: i18n.ADVANCED_PREVIEW_TOGGLE_BUTTON,
        'data-test-subj': `rule-index-toggle-${ADVANCED_QUERY_SELECT_ID}`,
      },
    ],
    []
  );

  const showAdvancedOptions = queryPreviewIdSelected === ADVANCED_QUERY_SELECT_ID;
  const advancedOptions = useMemo(
    () =>
      showAdvancedOptions && formInterval && formLookback
        ? {
            timeframeStart,
            timeframeEnd,
            interval: formInterval,
            lookback: formLookback,
          }
        : undefined,
    [formInterval, formLookback, showAdvancedOptions, timeframeEnd, timeframeStart]
  );

  const [timeFrame, setTimeFrame] = useState<Unit>(defaultTimeRange);
  const {
    addNoiseWarning,
    createPreview,
    clearPreview,
    isPreviewRequestInProgress,
    previewId,
    logs,
    hasNoiseWarning,
    isAborted,
    showInvocationCountWarning,
  } = usePreviewRoute({
    index,
    isDisabled,
    dataViewId,
    dataSourceType,
    query,
    threatIndex,
    threatQuery,
    timeFrame,
    ruleType,
    threatMapping,
    threshold,
    machineLearningJobId,
    anomalyThreshold,
    eqlOptions,
    newTermsFields,
    historyWindowSize,
    advancedOptions,
  });

  // Resets the timeFrame to default when rule type is changed because not all time frames are supported by all rule types
  useEffect(() => {
    setTimeFrame(defaultTimeRange);
  }, [ruleType]);

  const { startTransaction } = useStartTransaction();

  const [isRefreshing, setIsRefreshing] = useState(false);
  useEffect(() => {
    if (!isRefreshing) {
      return;
    }
    createPreview();
    setIsRefreshing(false);
  }, [isRefreshing, createPreview]);

  const handlePreviewClick = useCallback(() => {
    startTransaction({ name: SINGLE_RULE_ACTIONS.PREVIEW });
    if (showAdvancedOptions) {
      // Refresh timeframe on Preview button click to make sure that relative times recalculated based on current time
      const { start, end } = refreshedTimeframe(startDate, endDate);
      setTimeframeStart(start);
      setTimeframeEnd(end);
    } else {
      clearPreview();
    }
    setIsRefreshing(true);
  }, [clearPreview, endDate, showAdvancedOptions, startDate, startTransaction]);

  const onTimeChange = useCallback(
    ({ start: newStart, end: newEnd, isInvalid }: OnTimeChangeProps) => {
      if (!isInvalid) {
        setStartDate(newStart);
        setEndDate(newEnd);
      }
    },
    []
  );

  return (
    <>
      <EuiButtonGroup
        legend="Quick query or advanced query preview selector"
        data-test-subj="quickAdvancedToggleButtonGroup"
        idSelected={queryPreviewIdSelected}
        onChange={onChangeDataSource}
        options={quickAdvancedToggleButtonOptions}
        color="primary"
      />
      <EuiSpacer size="s" />
      {showAdvancedOptions && showInvocationCountWarning && (
        <>
          <EuiCallOut
            color="warning"
            title={i18n.QUERY_PREVIEW_INVOCATION_COUNT_WARNING_TITLE}
            data-test-subj="previewInvocationCountWarning"
          >
            {i18n.QUERY_PREVIEW_INVOCATION_COUNT_WARNING_MESSAGE}
          </EuiCallOut>
          <EuiSpacer />
        </>
      )}
      <EuiFormRow
        label={i18n.QUERY_PREVIEW_LABEL}
        helpText={HelpTextComponent}
        error={undefined}
        isInvalid={false}
        data-test-subj="rule-preview"
        describedByIds={['rule-preview']}
      >
        <EuiFlexGroup>
          <EuiFlexItem grow={1}>
            {showAdvancedOptions ? (
              <EuiSuperDatePicker
                start={startDate}
                end={endDate}
                onTimeChange={onTimeChange}
                showUpdateButton={false}
                isDisabled={isDisabled}
                commonlyUsedRanges={timeRanges}
              />
            ) : (
              <Select
                id="preview-time-frame"
                options={getTimeframeOptions(ruleType)}
                value={timeFrame}
                onChange={(e) => setTimeFrame(e.target.value as Unit)}
                aria-label={i18n.QUERY_PREVIEW_SELECT_ARIA}
                disabled={isDisabled}
                data-test-subj="preview-time-frame"
              />
            )}
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <PreviewButton
              fill
              isLoading={isPreviewRequestInProgress}
              isDisabled={isDisabled || !areRelaventMlJobsRunning}
              onClick={handlePreviewClick}
              data-test-subj="queryPreviewButton"
            >
              {i18n.QUERY_PREVIEW_BUTTON}
            </PreviewButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFormRow>
      {showAdvancedOptions && (
        <Form form={form} data-test-subj="previewRule">
          <EuiSpacer size="s" />
          <UseField
            path="interval"
            component={ScheduleItem}
            componentProps={{
              idAria: 'detectionEnginePreviewRuleInterval',
              isDisabled,
              dataTestSubj: 'detectionEnginePreviewRuleInterval',
            }}
          />
          <UseField
            path="lookback"
            component={ScheduleItem}
            componentProps={{
              idAria: 'detectionEnginePreviewRuleLookback',
              isDisabled,
              dataTestSubj: 'detectionEnginePreviewRuleLookback',
              minimumValue: 1,
            }}
          />
          <EuiSpacer size="s" />
        </Form>
      )}
      {isPreviewRequestInProgress && <LoadingHistogram />}
      {!isPreviewRequestInProgress && previewId && spaceId && (
        <PreviewHistogram
          ruleType={ruleType}
          timeFrame={timeFrame}
          previewId={previewId}
          addNoiseWarning={addNoiseWarning}
          spaceId={spaceId}
          indexPattern={indexPattern}
          advancedOptions={advancedOptions}
        />
      )}
      <PreviewLogsComponent logs={logs} hasNoiseWarning={hasNoiseWarning} isAborted={isAborted} />
    </>
  );
};

export const RulePreview = React.memo(RulePreviewComponent);
