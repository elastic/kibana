/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useCallback, useMemo } from 'react';

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiTitle,
  EuiPageContentHeader_Deprecated as EuiPageContentHeader,
  EuiPageContentHeaderSection_Deprecated as EuiPageContentHeaderSection,
} from '@elastic/eui';

import { useUrlState } from '@kbn/ml-url-state';
import { useStorage } from '@kbn/ml-local-storage';
import {
  MlDatePickerContextProvider,
  MlDatePickerWrapper,
  MlFullTimeRangeSelector,
  type MlFullTimeRangeSelectorProps,
  FROZEN_TIER_PREFERENCE,
} from '@kbn/ml-date-picker';
import { UI_SETTINGS } from '@kbn/data-plugin/common';
import { toMountPoint, wrapWithTheme } from '@kbn/kibana-react-plugin/public';

import { useCss } from '../../hooks/use_css';
import { useAiopsAppContext } from '../../hooks/use_aiops_app_context';
import { useDataSource } from '../../hooks/use_data_source';
import { useTimefilter } from '../../hooks/use_time_filter';
import {
  AIOPS_FROZEN_TIER_PREFERENCE,
  type AiOpsKey,
  type AiOpsStorageMapped,
} from '../../types/storage';

interface PageHeaderProps {
  compact?: boolean;
}

export const PageHeader: FC<PageHeaderProps> = ({ compact }) => {
  const { aiopsPageHeader, dataViewTitleHeader } = useCss();
  const { http, notifications, uiSettings, theme, data: dataService } = useAiopsAppContext();

  const [, setGlobalState] = useUrlState('_g');
  const { dataView } = useDataSource();

  const [frozenDataPreference, setFrozenDataPreference] = useStorage<
    AiOpsKey,
    AiOpsStorageMapped<typeof AIOPS_FROZEN_TIER_PREFERENCE>
  >(
    AIOPS_FROZEN_TIER_PREFERENCE,
    // By default we will exclude frozen data tier
    FROZEN_TIER_PREFERENCE.EXCLUDE
  );

  const timefilter = useTimefilter({
    timeRangeSelector: dataView.timeFieldName !== undefined,
    autoRefreshSelector: true,
  });

  const updateTimeState: MlFullTimeRangeSelectorProps['callback'] = useCallback(
    (update) => {
      setGlobalState({ time: { from: update.start.string, to: update.end.string } });
    },
    [setGlobalState]
  );

  const hasValidTimeField = useMemo(
    () => dataView.timeFieldName !== undefined && dataView.timeFieldName !== '',
    [dataView.timeFieldName]
  );

  return (
    <EuiFlexGroup gutterSize="none">
      <EuiFlexItem>
        <EuiPageContentHeader
          css={[
            aiopsPageHeader,
            compact ? { flexDirection: 'column', alignItems: 'flex-start' } : {},
          ]}
        >
          <EuiPageContentHeaderSection>
            <div css={dataViewTitleHeader}>
              <EuiTitle size="s">
                <h2>{dataView.getName()}</h2>
              </EuiTitle>
            </div>
          </EuiPageContentHeaderSection>

          {compact ? <EuiSpacer size="m" /> : null}
          <MlDatePickerContextProvider
            deps={{ data: dataService, http, notifications, theme, uiSettings }}
          >
            <EuiFlexGroup
              alignItems="center"
              justifyContent="flexEnd"
              gutterSize="s"
              data-test-subj="aiopsTimeRangeSelectorSection"
            >
              {hasValidTimeField ? (
                <EuiFlexItem grow={false}>
                  <MlFullTimeRangeSelector
                    frozenDataPreference={frozenDataPreference}
                    setFrozenDataPreference={setFrozenDataPreference}
                    dataView={dataView}
                    query={undefined}
                    disabled={false}
                    timefilter={timefilter}
                    callback={updateTimeState}
                  />
                </EuiFlexItem>
              ) : null}
              <EuiFlexItem grow={false}>
                <MlDatePickerWrapper
                  uiSettingsKeys={UI_SETTINGS}
                  wrapWithTheme={wrapWithTheme}
                  toMountPoint={toMountPoint}
                  isAutoRefreshOnly={!hasValidTimeField}
                  showRefresh={!hasValidTimeField}
                  compact={compact}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </MlDatePickerContextProvider>
        </EuiPageContentHeader>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
