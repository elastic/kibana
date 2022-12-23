/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useCallback } from 'react';
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
  MlFullTimeRangeSelector,
  type MlFullTimeRangeSelectorProps,
  FROZEN_TIER_PREFERENCE,
} from '@kbn/ml-date-picker';
import { useCss } from '../../hooks/use_css';
import { useDataSource } from '../../hooks/use_data_source';
import { useTimefilter } from '../../hooks/use_time_filter';
import { DatePickerWrapper } from '../date_picker_wrapper';
import {
  AIOPS_FROZEN_TIER_PREFERENCE,
  type AiOpsKey,
  type AiOpsStorageMapped,
} from '../../types/storage';

export const PageHeader: FC = () => {
  const { aiopsPageHeader, dataViewTitleHeader } = useCss();
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

  return (
    <>
      <EuiFlexGroup gutterSize="none">
        <EuiFlexItem>
          <EuiPageContentHeader css={aiopsPageHeader}>
            <EuiPageContentHeaderSection>
              <div css={dataViewTitleHeader}>
                <EuiTitle size="s">
                  <h2>{dataView.getName()}</h2>
                </EuiTitle>
              </div>
            </EuiPageContentHeaderSection>

            <EuiFlexGroup
              alignItems="center"
              justifyContent="flexEnd"
              gutterSize="s"
              data-test-subj="aiopsTimeRangeSelectorSection"
            >
              {dataView.timeFieldName !== undefined && (
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
              )}
              <EuiFlexItem grow={false}>
                <DatePickerWrapper />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiPageContentHeader>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer />
    </>
  );
};
