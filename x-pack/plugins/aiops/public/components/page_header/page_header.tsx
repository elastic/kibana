/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiTitle } from '@elastic/eui';
import { type DataView } from '@kbn/data-views-plugin/common';
import { useTimefilter } from '../../hooks/use_time_filter';
import { FullTimeRangeSelector } from '../full_time_range_selector';
import { DatePickerWrapper } from '../date_picker_wrapper';

export interface PageHeaderProps {
  dataView: DataView;
}

export const PageHeader: FC<PageHeaderProps> = ({ dataView }) => {
  const timefilter = useTimefilter({ timeRangeSelector: true });

  return (
    <>
      <EuiFlexGroup gutterSize="s" alignItems={'center'}>
        <EuiFlexItem grow={false} css={{ minWidth: '300px' }}>
          <EuiTitle size="s">
            <h2>{dataView.getName()}</h2>
          </EuiTitle>
        </EuiFlexItem>

        <EuiFlexItem grow={true}>
          <EuiFlexGroup gutterSize={'s'} alignItems={'center'} justifyContent={'flexEnd'}>
            {dataView.timeFieldName !== undefined ? (
              <EuiFlexItem grow={false}>
                <FullTimeRangeSelector
                  dataView={dataView}
                  query={undefined}
                  disabled={false}
                  timefilter={timefilter}
                />
              </EuiFlexItem>
            ) : null}

            <EuiFlexItem grow={false} css={{ width: '350px' }}>
              <DatePickerWrapper />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer />
    </>
  );
};
