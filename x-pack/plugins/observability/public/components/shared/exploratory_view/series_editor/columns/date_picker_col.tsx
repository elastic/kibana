/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import styled from 'styled-components';
import { i18n } from '@kbn/i18n';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { useSeriesStorage } from '../../hooks/use_series_storage';
import { DateRangePicker } from '../../components/date_range_picker';
import { SeriesDatePicker } from '../../components/series_date_picker';
import { AppDataType, SeriesUrl } from '../../types';
import { ReportTypes } from '../../configurations/constants';
import { useAppDataViewContext } from '../../hooks/use_app_data_view';
import { SyntheticsAddData } from '../../../add_data_buttons/synthetics_add_data';
import { MobileAddData } from '../../../add_data_buttons/mobile_add_data';
import { UXAddData } from '../../../add_data_buttons/ux_add_data';

interface Props {
  seriesId: number;
  series: SeriesUrl;
}

const AddDataComponents: Record<AppDataType, React.FC | null> = {
  mobile: MobileAddData,
  ux: UXAddData,
  synthetics: SyntheticsAddData,
  apm: null,
  infra_logs: null,
  infra_metrics: null,
};

export function DatePickerCol({ seriesId, series }: Props) {
  const { reportType } = useSeriesStorage();

  const { hasAppData } = useAppDataViewContext();

  if (!series.dataType) {
    return null;
  }

  const AddDataButton = AddDataComponents[series.dataType];
  if (hasAppData[series.dataType] === false && AddDataButton !== null) {
    return (
      <EuiFlexGroup alignItems="center">
        <EuiFlexItem grow={false}>
          <strong>
            {i18n.translate('xpack.observability.overview.exploratoryView.noDataAvailable', {
              defaultMessage: 'No {dataType} data available.',
              values: {
                dataType: series.dataType,
              },
            })}
          </strong>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <AddDataButton />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  return (
    <Wrapper>
      {seriesId === 0 || reportType !== ReportTypes.KPI ? (
        <SeriesDatePicker seriesId={seriesId} series={series} />
      ) : (
        <DateRangePicker seriesId={seriesId} series={series} />
      )}
    </Wrapper>
  );
}

const Wrapper = styled.div`
  width: 100%;
  .euiSuperDatePicker__flexWrapper {
    width: 100%;
    > .euiFlexItem {
      margin-right: 0;
    }
  }
`;
