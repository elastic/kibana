/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AttachmentType } from '@kbn/cases-plugin/common';
import {
  DataQualityPanel,
  DATA_QUALITY_SUBTITLE,
  ECS_REFERENCE_URL,
  getIlmPhaseDescription,
  ILM_PHASE,
  INDEX_LIFECYCLE_MANAGEMENT_PHASES,
  SELECT_ONE_OR_MORE_ILM_PHASES,
} from '@kbn/ecs-data-quality-dashboard';
import type { EuiComboBoxOptionOption, OnTimeChangeProps } from '@elastic/eui';
import {
  EuiComboBox,
  EuiFormControlLayout,
  EuiFormLabel,
  EuiLink,
  EuiLoadingSpinner,
  EuiText,
  EuiToolTip,
  useGeneratedHtmlId,
  EuiSuperDatePicker,
} from '@elastic/eui';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';

import { useAssistantAvailability } from '../../assistant/use_assistant_availability';
import { SecurityPageName } from '../../app/types';
import { getGroupByFieldsOnClick } from '../../common/components/alerts_treemap/lib/helpers';
import { useThemes } from '../../common/components/charts/common';
import { HeaderPage } from '../../common/components/header_page';
import { EmptyPrompt } from '../../common/components/empty_prompt';
import { useLocalStorage } from '../../common/components/local_storage';
import { SecuritySolutionPageWrapper } from '../../common/components/page_wrapper';
import { APP_ID, DEFAULT_BYTES_FORMAT, DEFAULT_NUMBER_FORMAT } from '../../../common/constants';
import { useSourcererDataView } from '../../common/containers/sourcerer';
import { KibanaServices, useKibana, useToasts, useUiSetting$ } from '../../common/lib/kibana';
import { SpyRoute } from '../../common/utils/route/spy_routes';
import { useSignalIndex } from '../../detections/containers/detection_engine/alerts/use_signal_index';
import * as i18n from './translations';
import type {
  ReportDataQualityCheckAllCompletedParams,
  ReportDataQualityIndexCheckedParams,
} from '../../common/lib/telemetry';

const LOCAL_STORAGE_KEY = 'dataQualityDashboardLastChecked';

const comboBoxStyle: React.CSSProperties = {
  width: '322px',
};

const FormControlLayout = styled(EuiFormControlLayout)`
  max-width: 500px;
  height: 42px;

  .euiFormControlLayout__childrenWrapper {
    overflow: visible;
  }
`;

const Option = styled.div`
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  width: 100%;
`;

const OptionLabel = styled.span`
  font-weight: bold;
`;

const options: EuiComboBoxOptionOption[] = [
  {
    label: i18n.HOT,
    value: 'hot',
  },
  {
    label: i18n.WARM,
    value: 'warm',
  },
  {
    disabled: true,
    label: i18n.COLD,
    value: 'cold',
  },
  {
    disabled: true,
    label: i18n.FROZEN,
    value: 'frozen',
  },
  {
    label: i18n.UNMANAGED,
    value: 'unmanaged',
  },
];

const defaultOptions: EuiComboBoxOptionOption[] = [
  {
    label: i18n.HOT,
    value: 'hot',
  },
  {
    label: i18n.WARM,
    value: 'warm',
  },
  {
    label: i18n.UNMANAGED,
    value: 'unmanaged',
  },
];

const DEFAULT_START_TIME = 'now-7d';
const DEFAULT_END_TIME = 'now';

const renderOption = (
  option: EuiComboBoxOptionOption<string | number | string[] | undefined>
): React.ReactNode => (
  <EuiToolTip content={`${option.label}: ${getIlmPhaseDescription(option.label)}`}>
    <Option>
      <OptionLabel>{`${option.label}`}</OptionLabel>
      {': '}
      <span>{getIlmPhaseDescription(option.label)}</span>
    </Option>
  </EuiToolTip>
);

const DataQualityComponent: React.FC = () => {
  const { hasAssistantPrivilege } = useAssistantAvailability();
  const httpFetch = KibanaServices.get().http.fetch;
  const { baseTheme, theme } = useThemes();
  const toasts = useToasts();

  const [defaultBytesFormat] = useUiSetting$<string>(DEFAULT_BYTES_FORMAT);
  const [defaultNumberFormat] = useUiSetting$<string>(DEFAULT_NUMBER_FORMAT);
  const labelInputId = useGeneratedHtmlId({ prefix: 'labelInput' });
  const [selectedOptions, setSelectedOptions] = useState<EuiComboBoxOptionOption[]>(defaultOptions);
  const { indicesExist, loading: isSourcererLoading, selectedPatterns } = useSourcererDataView();
  const { signalIndexName, loading: isSignalIndexNameLoading } = useSignalIndex();
  const { configSettings, cases, telemetry } = useKibana().services;
  const isILMAvailable = configSettings.ILMEnabled;

  const [startDate, setStartTime] = useState<string>();
  const [endDate, setEndTime] = useState<string>();
  const onTimeChange = ({ start, end, isInvalid }: OnTimeChangeProps) => {
    if (isInvalid) {
      return;
    }

    setStartTime(start);
    setEndTime(end);
  };

  useEffect(() => {
    if (!isILMAvailable) {
      setStartTime(DEFAULT_START_TIME);
      setEndTime(DEFAULT_END_TIME);
    }
  }, [isILMAvailable]);

  const alertsAndSelectedPatterns = useMemo(
    () =>
      signalIndexName != null ? [signalIndexName, ...selectedPatterns] : [...selectedPatterns],
    [selectedPatterns, signalIndexName]
  );

  const subtitle = useMemo(
    () => (
      <EuiText color="subdued" size="s">
        <span>{DATA_QUALITY_SUBTITLE}</span>{' '}
        <EuiLink external={true} href={ECS_REFERENCE_URL} rel="noopener noreferrer" target="_blank">
          {i18n.ELASTIC_COMMON_SCHEMA}
        </EuiLink>
      </EuiText>
    ),
    []
  );

  const ilmPhases: string[] = useMemo(
    () => selectedOptions.map(({ label }) => label),
    [selectedOptions]
  );

  const ilmFormLabel = useMemo(
    () => <EuiFormLabel htmlFor={labelInputId}>{ILM_PHASE}</EuiFormLabel>,
    [labelInputId]
  );

  const [lastChecked, setLastChecked] = useLocalStorage<string>({
    defaultValue: '',
    key: LOCAL_STORAGE_KEY,
  });

  const userCasesPermissions = cases.helpers.canUseCases([APP_ID]);
  const canUserCreateAndReadCases = useCallback(
    () => userCasesPermissions.create && userCasesPermissions.read,
    [userCasesPermissions.create, userCasesPermissions.read]
  );

  const createCaseFlyout = cases.hooks.useCasesAddToNewCaseFlyout({
    toastContent: i18n.ADD_TO_CASE_SUCCESS,
  });
  const openCreateCaseFlyout = useCallback(
    ({ comments, headerContent }: { comments: string[]; headerContent?: React.ReactNode }) => {
      const attachments: Array<{
        comment: string;
        type: AttachmentType.user;
      }> = comments.map((x) => ({
        comment: x,
        type: AttachmentType.user,
      }));

      createCaseFlyout.open({ attachments, headerContent });
    },
    [createCaseFlyout]
  );

  const reportDataQualityIndexChecked = useCallback(
    (params: ReportDataQualityIndexCheckedParams) => {
      telemetry.reportDataQualityIndexChecked(params);
    },
    [telemetry]
  );

  const reportDataQualityCheckAllCompleted = useCallback(
    (params: ReportDataQualityCheckAllCompletedParams) => {
      telemetry.reportDataQualityCheckAllCompleted(params);
    },
    [telemetry]
  );

  if (isSourcererLoading || isSignalIndexNameLoading) {
    return <EuiLoadingSpinner size="l" data-test-subj="ecsDataQualityDashboardLoader" />;
  }

  return (
    <>
      {indicesExist ? (
        <SecuritySolutionPageWrapper data-test-subj="ecsDataQualityDashboardPage">
          <HeaderPage subtitle={subtitle} title={i18n.DATA_QUALITY_TITLE}>
            {isILMAvailable && (
              <EuiToolTip content={INDEX_LIFECYCLE_MANAGEMENT_PHASES}>
                <FormControlLayout prepend={ilmFormLabel}>
                  <EuiComboBox
                    id={labelInputId}
                    data-test-subj="selectIlmPhases"
                    placeholder={SELECT_ONE_OR_MORE_ILM_PHASES}
                    renderOption={renderOption}
                    selectedOptions={selectedOptions}
                    style={comboBoxStyle}
                    options={options}
                    onChange={setSelectedOptions}
                  />
                </FormControlLayout>
              </EuiToolTip>
            )}
            {!isILMAvailable && startDate && endDate && (
              <EuiToolTip content={i18n.DATE_PICKER_TOOLTIP}>
                <EuiSuperDatePicker
                  start={startDate}
                  end={endDate}
                  onTimeChange={onTimeChange}
                  showUpdateButton={false}
                  isDisabled={true}
                  data-test-subj="dataQualityDatePicker"
                />
              </EuiToolTip>
            )}
          </HeaderPage>

          <DataQualityPanel
            baseTheme={baseTheme}
            canUserCreateAndReadCases={canUserCreateAndReadCases}
            defaultBytesFormat={defaultBytesFormat}
            defaultNumberFormat={defaultNumberFormat}
            endDate={endDate}
            getGroupByFieldsOnClick={getGroupByFieldsOnClick}
            reportDataQualityCheckAllCompleted={reportDataQualityCheckAllCompleted}
            reportDataQualityIndexChecked={reportDataQualityIndexChecked}
            httpFetch={httpFetch}
            ilmPhases={ilmPhases}
            isAssistantEnabled={hasAssistantPrivilege}
            isILMAvailable={isILMAvailable}
            lastChecked={lastChecked}
            openCreateCaseFlyout={openCreateCaseFlyout}
            patterns={alertsAndSelectedPatterns}
            setLastChecked={setLastChecked}
            startDate={startDate}
            theme={theme}
            toasts={toasts}
          />
        </SecuritySolutionPageWrapper>
      ) : (
        <EmptyPrompt />
      )}

      <SpyRoute pageName={SecurityPageName.dataQuality} />
    </>
  );
};

DataQualityComponent.displayName = 'DataQualityComponent';

export const DataQuality = React.memo(DataQualityComponent);
