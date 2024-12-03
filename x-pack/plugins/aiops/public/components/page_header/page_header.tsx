/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';
import type { FC } from 'react';
import React, { useCallback, useMemo } from 'react';

import { EuiPageHeader } from '@elastic/eui';

import { useUrlState } from '@kbn/ml-url-state';
import { useStorage } from '@kbn/ml-local-storage';
import {
  useTimefilter,
  DatePickerWrapper,
  FullTimeRangeSelector,
  type FullTimeRangeSelectorProps,
  FROZEN_TIER_PREFERENCE,
} from '@kbn/ml-date-picker';

import moment from 'moment';
import { useDataSource } from '../../hooks/use_data_source';
import {
  AIOPS_FROZEN_TIER_PREFERENCE,
  type AiOpsKey,
  type AiOpsStorageMapped,
} from '../../types/storage';

const dataViewTitleHeader = css({
  minWidth: '300px',
});

export const PageHeader: FC = () => {
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

  const updateTimeState = useCallback<NonNullable<FullTimeRangeSelectorProps['callback']>>(
    (update) => {
      setGlobalState({
        time: {
          from: moment(update.start.epoch).toISOString(),
          to: moment(update.end.epoch).toISOString(),
        },
      });
    },
    [setGlobalState]
  );

  const hasValidTimeField = useMemo(
    () => dataView.timeFieldName !== undefined && dataView.timeFieldName !== '',
    [dataView.timeFieldName]
  );

  return (
    <EuiPageHeader
      pageTitle={<div css={dataViewTitleHeader}>{dataView.getName()}</div>}
      rightSideGroupProps={{
        gutterSize: 's',
        'data-test-subj': 'aiopsTimeRangeSelectorSection',
      }}
      rightSideItems={[
        <DatePickerWrapper
          isAutoRefreshOnly={!hasValidTimeField}
          showRefresh={!hasValidTimeField}
          width="full"
          flexGroup={!hasValidTimeField}
        />,
        hasValidTimeField && (
          <FullTimeRangeSelector
            frozenDataPreference={frozenDataPreference}
            setFrozenDataPreference={setFrozenDataPreference}
            dataView={dataView}
            query={undefined}
            disabled={false}
            timefilter={timefilter}
            callback={updateTimeState}
          />
        ),
      ].filter(Boolean)}
    />
  );
};
