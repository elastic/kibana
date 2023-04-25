/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CommentType } from '@kbn/cases-plugin/common';
import {
  DataQualityPanel,
  DATA_QUALITY_SUBTITLE,
  ECS_REFERENCE_URL,
  getIlmPhaseDescription,
  ILM_PHASE,
  INDEX_LIFECYCLE_MANAGEMENT_PHASES,
  SELECT_ONE_OR_MORE_ILM_PHASES,
} from '@kbn/ecs-data-quality-dashboard';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import {
  EuiComboBox,
  EuiFormControlLayout,
  EuiFormLabel,
  EuiLink,
  EuiLoadingSpinner,
  EuiText,
  EuiToolTip,
  useGeneratedHtmlId,
} from '@elastic/eui';
import React, { useCallback, useMemo, useState } from 'react';
import styled from 'styled-components';

import { SecurityPageName } from '../../app/types';
import { getGroupByFieldsOnClick } from '../../common/components/alerts_treemap/lib/helpers';
import { useTheme } from '../../common/components/charts/common';
import { HeaderPage } from '../../common/components/header_page';
import { LandingPageComponent } from '../../common/components/landing_page';
import { useLocalStorage } from '../../common/components/local_storage';
import { SecuritySolutionPageWrapper } from '../../common/components/page_wrapper';
import { DEFAULT_BYTES_FORMAT, DEFAULT_NUMBER_FORMAT } from '../../../common/constants';
import { useSourcererDataView } from '../../common/containers/sourcerer';
import {
  useGetUserCasesPermissions,
  useKibana,
  useToasts,
  useUiSetting$,
} from '../../common/lib/kibana';
import { SpyRoute } from '../../common/utils/route/spy_routes';
import { useSignalIndex } from '../../detections/containers/detection_engine/alerts/use_signal_index';
import * as i18n from './translations';

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
  const theme = useTheme();
  const toasts = useToasts();
  const addSuccessToast = useCallback(
    (toast: { title: string }) => {
      toasts.addSuccess(toast);
    },
    [toasts]
  );
  const [defaultBytesFormat] = useUiSetting$<string>(DEFAULT_BYTES_FORMAT);
  const [defaultNumberFormat] = useUiSetting$<string>(DEFAULT_NUMBER_FORMAT);
  const labelInputId = useGeneratedHtmlId({ prefix: 'labelInput' });
  const [selectedOptions, setSelectedOptions] = useState<EuiComboBoxOptionOption[]>(defaultOptions);
  const { indicesExist, loading: isSourcererLoading, selectedPatterns } = useSourcererDataView();
  const { signalIndexName, loading: isSignalIndexNameLoading } = useSignalIndex();

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

  const userCasesPermissions = useGetUserCasesPermissions();
  const canUserCreateAndReadCases = useCallback(
    () => userCasesPermissions.create && userCasesPermissions.read,
    [userCasesPermissions.create, userCasesPermissions.read]
  );

  const { cases } = useKibana().services;
  const createCaseFlyout = cases.hooks.useCasesAddToNewCaseFlyout({
    toastContent: i18n.ADD_TO_CASE_SUCCESS,
  });
  const openCreateCaseFlyout = useCallback(
    ({ comments, headerContent }: { comments: string[]; headerContent?: React.ReactNode }) => {
      const attachments: Array<{
        comment: string;
        type: CommentType.user;
      }> = comments.map((x) => ({
        comment: x,
        type: CommentType.user,
      }));

      createCaseFlyout.open({ attachments, headerContent });
    },
    [createCaseFlyout]
  );

  return (
    <>
      {indicesExist ? (
        <>
          <SecuritySolutionPageWrapper data-test-subj="ecsDataQualityDashboardPage">
            <HeaderPage subtitle={subtitle} title={i18n.DATA_QUALITY_TITLE}>
              <EuiToolTip content={INDEX_LIFECYCLE_MANAGEMENT_PHASES}>
                <FormControlLayout prepend={ilmFormLabel}>
                  <EuiComboBox
                    id={labelInputId}
                    placeholder={SELECT_ONE_OR_MORE_ILM_PHASES}
                    renderOption={renderOption}
                    selectedOptions={selectedOptions}
                    style={comboBoxStyle}
                    options={options}
                    onChange={setSelectedOptions}
                  />
                </FormControlLayout>
              </EuiToolTip>
            </HeaderPage>

            {isSourcererLoading || isSignalIndexNameLoading ? (
              <EuiLoadingSpinner size="l" data-test-subj="ecsDataQualityDashboardLoader" />
            ) : (
              <DataQualityPanel
                addSuccessToast={addSuccessToast}
                canUserCreateAndReadCases={canUserCreateAndReadCases}
                defaultBytesFormat={defaultBytesFormat}
                defaultNumberFormat={defaultNumberFormat}
                getGroupByFieldsOnClick={getGroupByFieldsOnClick}
                ilmPhases={ilmPhases}
                lastChecked={lastChecked}
                openCreateCaseFlyout={openCreateCaseFlyout}
                patterns={alertsAndSelectedPatterns}
                setLastChecked={setLastChecked}
                theme={theme}
              />
            )}
          </SecuritySolutionPageWrapper>
        </>
      ) : (
        <LandingPageComponent />
      )}

      <SpyRoute pageName={SecurityPageName.dataQuality} />
    </>
  );
};

DataQualityComponent.displayName = 'DataQualityComponent';

export const DataQuality = React.memo(DataQualityComponent);
