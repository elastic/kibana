/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiSuperSelect } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useKibana } from '../../../../../../../../../src/plugins/kibana_react/public';
import { ObservabilityPublicPluginsStart } from '../../../../../plugin';
import { useFetcher } from '../../../../..';
import { useSeriesStorage } from '../../hooks/use_series_storage';
import { SeriesType } from '../../../../../../../lens/public';

const CHART_TYPE_LABEL = i18n.translate('xpack.observability.expView.chartTypes.label', {
  defaultMessage: 'Chart type',
});

export function SeriesChartTypesSelect({
  seriesId,
  seriesTypes,
  defaultChartType,
}: {
  seriesId: string;
  seriesTypes?: SeriesType[];
  defaultChartType: SeriesType;
}) {
  const { getSeries, setSeries } = useSeriesStorage();

  const series = getSeries(seriesId);

  const seriesType = series?.seriesType ?? defaultChartType;

  const onChange = (value: SeriesType) => {
    setSeries(seriesId, { ...series, seriesType: value });
  };

  return (
    <XYChartTypesSelect
      onChange={onChange}
      value={seriesType}
      excludeChartTypes={['bar_percentage_stacked']}
      includeChartTypes={
        seriesTypes || [
          'bar',
          'bar_horizontal',
          'line',
          'area',
          'bar_stacked',
          'area_stacked',
          'bar_horizontal_percentage_stacked',
        ]
      }
      label={CHART_TYPE_LABEL}
    />
  );
}

export interface XYChartTypesProps {
  label?: string;
  value: SeriesType;
  includeChartTypes?: SeriesType[];
  excludeChartTypes?: SeriesType[];
  onChange: (value: SeriesType) => void;
}

export function XYChartTypesSelect({
  onChange,
  value,
  includeChartTypes,
  excludeChartTypes,
}: XYChartTypesProps) {
  const {
    services: { lens },
  } = useKibana<ObservabilityPublicPluginsStart>();

  const { data = [], loading } = useFetcher(() => lens.getXyVisTypes(), [lens]);

  let vizTypes = data;

  if ((excludeChartTypes ?? []).length > 0) {
    vizTypes = vizTypes.filter(({ id }) => !excludeChartTypes?.includes(id as SeriesType));
  }

  if ((includeChartTypes ?? []).length > 0) {
    vizTypes = vizTypes.filter(({ id }) => includeChartTypes?.includes(id as SeriesType));
  }

  const options = (vizTypes ?? []).map(({ id, fullLabel, label, icon }) => {
    const LabelWithIcon = (
      <EuiFlexGroup gutterSize="s" alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiIcon type={icon} />
        </EuiFlexItem>
        <EuiFlexItem>{fullLabel || label}</EuiFlexItem>
      </EuiFlexGroup>
    );
    return {
      value: id as SeriesType,
      inputDisplay: LabelWithIcon,
      dropdownDisplay: LabelWithIcon,
    };
  });

  return (
    <EuiSuperSelect
      fullWidth
      compressed
      prepend={CHART_TYPE_LABEL}
      valueOfSelected={value}
      isLoading={loading}
      options={options}
      onChange={onChange}
    />
  );
}
