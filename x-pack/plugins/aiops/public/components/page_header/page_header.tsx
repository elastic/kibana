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
import { FullTimeRangeSelectorProps } from '../full_time_range_selector/full_time_range_selector';
import { useDataSource } from '../../hooks/use_data_source';
import { useTimefilter } from '../../hooks/use_time_filter';
import { FullTimeRangeSelector } from '../full_time_range_selector';
import { DatePickerWrapper } from '../date_picker_wrapper';

export const PageHeader: FC = () => {
  const [, setGlobalState] = useUrlState('_g');
  const { dataView } = useDataSource();

  const timefilter = useTimefilter({
    timeRangeSelector: dataView.timeFieldName !== undefined,
    autoRefreshSelector: true,
  });

  const updateTimeState: FullTimeRangeSelectorProps['callback'] = useCallback(
    (update) => {
      setGlobalState({ time: { from: update.start.string, to: update.end.string } });
    },
    [setGlobalState]
  );

  return (
    <>
      <EuiFlexGroup gutterSize="none">
        <EuiFlexItem>
          <EuiPageContentHeader className="aiopsPageHeader">
            <EuiPageContentHeaderSection>
              <div className="dataViewTitleHeader">
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
                  <FullTimeRangeSelector
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
