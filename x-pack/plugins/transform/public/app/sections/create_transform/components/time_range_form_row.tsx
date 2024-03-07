/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, type FC } from 'react';
import { merge } from 'rxjs';

import { EuiFlexGroup, EuiFlexItem, EuiFormRow, EuiIconTip } from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import {
  mlTimefilterRefresh$,
  useTimefilter,
  DatePickerWrapper,
  FullTimeRangeSelector,
} from '@kbn/ml-date-picker';
import { FROZEN_TIER_PREFERENCE } from '@kbn/ml-date-picker';
import { useStorage } from '@kbn/ml-local-storage';
import { useUrlState } from '@kbn/ml-url-state';

import {
  TRANSFORM_FROZEN_TIER_PREFERENCE,
  type TransformStorageKey,
  type TransformStorageMapped,
} from '../../../../../common/types/storage';

import { advancedEditorsSidebarWidth } from '../constants';

import { DatePickerApplySwitch } from './date_picker_apply_switch';
import { useDatePicker } from './step_define/hooks/use_date_picker';
import { useDataView, useSearchItems } from './wizard/wizard';

const ALLOW_TIME_RANGE_ON_TRANSFORM_CONFIG = false;

export const TimeRangeFormRow: FC = () => {
  const [globalState, setGlobalState] = useUrlState('_g');
  const searchItems = useSearchItems();
  const dataView = useDataView();

  const [frozenDataPreference, setFrozenDataPreference] = useStorage<
    TransformStorageKey,
    TransformStorageMapped<typeof TRANSFORM_FROZEN_TIER_PREFERENCE>
  >(
    TRANSFORM_FROZEN_TIER_PREFERENCE,
    // By default we will exclude frozen data tier
    FROZEN_TIER_PREFERENCE.EXCLUDE
  );

  const { hasValidTimeField } = useDatePicker();

  const timefilter = useTimefilter({
    timeRangeSelector: dataView?.timeFieldName !== undefined,
    autoRefreshSelector: false,
  });

  useEffect(() => {
    if (globalState?.time !== undefined) {
      timefilter.setTime({
        from: globalState.time.from,
        to: globalState.time.to,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(globalState?.time), timefilter]);

  useEffect(() => {
    if (globalState?.refreshInterval !== undefined) {
      timefilter.setRefreshInterval(globalState.refreshInterval);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(globalState?.refreshInterval), timefilter]);

  useEffect(() => {
    const timeUpdateSubscription = merge(
      timefilter.getAutoRefreshFetch$(),
      timefilter.getTimeUpdate$(),
      mlTimefilterRefresh$
    ).subscribe(() => {
      if (setGlobalState) {
        setGlobalState({
          time: timefilter.getTime(),
          refreshInterval: timefilter.getRefreshInterval(),
        });
      }
    });
    return () => {
      timeUpdateSubscription.unsubscribe();
    };
  });

  if (!hasValidTimeField) return null;

  return (
    <EuiFormRow
      fullWidth
      label={
        <>
          {i18n.translate('xpack.transform.stepDefineForm.datePickerLabel', {
            defaultMessage: 'Time range',
          })}{' '}
          <EuiIconTip
            content={i18n.translate('xpack.transform.stepDefineForm.datePickerIconTipContent', {
              defaultMessage:
                'The time range is applied to previews only and will not be part of the final transform configuration.',
            })}
          />
        </>
      }
    >
      <EuiFlexGroup alignItems="flexStart" justifyContent="spaceBetween">
        {/* Flex Column #1: Date Picker */}
        <EuiFlexItem>
          <DatePickerWrapper
            isAutoRefreshOnly={!hasValidTimeField}
            showRefresh={!hasValidTimeField}
            width="full"
          />
        </EuiFlexItem>
        {/* Flex Column #2: Apply-To-Config option */}
        <EuiFlexItem grow={false} style={{ width: advancedEditorsSidebarWidth }}>
          {ALLOW_TIME_RANGE_ON_TRANSFORM_CONFIG && (
            <EuiFlexGroup alignItems="center" justifyContent="spaceBetween">
              <EuiFlexItem grow={false}>
                {searchItems.savedSearch === undefined && <DatePickerApplySwitch />}
              </EuiFlexItem>
            </EuiFlexGroup>
          )}
          <FullTimeRangeSelector
            frozenDataPreference={frozenDataPreference}
            setFrozenDataPreference={setFrozenDataPreference}
            dataView={dataView}
            query={undefined}
            disabled={false}
            timefilter={timefilter}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFormRow>
  );
};
