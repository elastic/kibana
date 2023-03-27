/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { isEmpty } from 'lodash';
import { TypedLensByValueInput } from '@kbn/lens-plugin/public';
import { EuiTheme } from '@kbn/kibana-react-plugin/common';
import { useKibanaSpace } from '../../../../hooks/use_kibana_space';
import { HeatMapLensAttributes } from '../configurations/lens_attributes/heatmap_attributes';
import { useLensFormulaHelper } from './use_lens_formula_helper';
import { ALL_VALUES_SELECTED } from '../configurations/constants/url_constants';
import { LayerConfig, LensAttributes } from '../configurations/lens_attributes';
import {
  AllSeries,
  allSeriesKey,
  convertAllShortSeries,
  reportTypeKey,
  useSeriesStorage,
} from './use_series_storage';
import { getDefaultConfigs } from '../configurations/default_configs';
import { ReportViewType, SeriesUrl, UrlFilter } from '../types';
import { DataViewState, useAppDataViewContext } from './use_app_data_view';
import { useTheme } from '../../../../hooks/use_theme';
import { LABEL_FIELDS_BREAKDOWN } from '../configurations/constants';
import { ReportConfigMap, useExploratoryView } from '../contexts/exploratory_view_config';
import { SingleMetricLensAttributes } from '../configurations/lens_attributes/single_metric_attributes';

export const getFiltersFromDefs = (
  reportDefinitions: SeriesUrl['reportDefinitions'] | SeriesUrl['textReportDefinitions']
) => {
  return Object.entries(reportDefinitions ?? {})
    .map(([field, value]) => {
      return {
        field,
        values: Array.isArray(value) ? value : [value],
      };
    })
    .filter(({ values }) => !values.includes(ALL_VALUES_SELECTED)) as UrlFilter[];
};

export function getLayerConfigs(
  allSeries: AllSeries,
  reportType: ReportViewType,
  theme: EuiTheme,
  dataViews: DataViewState,
  reportConfigMap: ReportConfigMap,
  spaceId?: string
) {
  const layerConfigs: LayerConfig[] = [];

  allSeries.forEach((series, seriesIndex) => {
    const dataView = dataViews?.[series?.dataType];

    if (
      dataView &&
      !isEmpty(series.reportDefinitions) &&
      !series.hidden &&
      series.selectedMetricField
    ) {
      const seriesConfig = getDefaultConfigs({
        reportType,
        dataView,
        dataType: series.dataType,
        reportConfigMap,
        spaceId,
      });

      const filters: UrlFilter[] = (series.filters ?? []).concat(
        getFiltersFromDefs(series.reportDefinitions),
        getFiltersFromDefs(series.textReportDefinitions)
      );

      const color = (theme.eui as unknown as Record<string, string>)?.[`euiColorVis${seriesIndex}`];
      let seriesColor = series.color!;
      if (reportType !== 'single-metric') {
        seriesColor = series.color ?? color;
      }

      layerConfigs.push({
        filters,
        dataView,
        seriesConfig,
        time: series.time,
        name: series.name,
        color: seriesColor,
        breakdown: series.breakdown === LABEL_FIELDS_BREAKDOWN ? undefined : series.breakdown,
        seriesType: series.seriesType,
        operationType: series.operationType,
        reportDefinitions: series.reportDefinitions ?? {},
        selectedMetricField: series.selectedMetricField,
        showPercentileAnnotations: series.showPercentileAnnotations,
      });
    }
  });

  return layerConfigs;
}

export const useLensAttributes = (): TypedLensByValueInput['attributes'] | null => {
  const { storage, allSeries, lastRefresh, reportType } = useSeriesStorage();

  const { dataViews } = useAppDataViewContext();

  const spaceId = useKibanaSpace();

  const { reportConfigMap } = useExploratoryView();

  const theme = useTheme();

  const lensFormulaHelper = useLensFormulaHelper();

  return useMemo(() => {
    // we only use the data from url to apply, since that gets updated to apply changes
    const allSeriesT: AllSeries = convertAllShortSeries(storage.get(allSeriesKey) ?? []);
    const reportTypeT: ReportViewType = storage.get(reportTypeKey) as ReportViewType;

    if (isEmpty(dataViews) || isEmpty(allSeriesT) || !reportTypeT || !lensFormulaHelper) {
      return null;
    }
    const layerConfigs = getLayerConfigs(
      allSeriesT,
      reportTypeT,
      theme,
      dataViews,
      reportConfigMap,
      spaceId.space?.id
    );

    if (layerConfigs.length < 1) {
      return null;
    }

    if (reportTypeT === 'single-metric') {
      const lensAttributes = new SingleMetricLensAttributes(
        layerConfigs,
        reportTypeT,
        lensFormulaHelper
      );

      return lensAttributes.getJSON('lnsLegacyMetric', lastRefresh);
    }

    if (reportTypeT === 'heatmap') {
      const lensAttributes = new HeatMapLensAttributes(
        layerConfigs,
        reportTypeT,
        lensFormulaHelper
      );

      return lensAttributes.getJSON('lnsHeatmap', lastRefresh);
    }

    const lensAttributes = new LensAttributes(layerConfigs, reportTypeT, lensFormulaHelper);

    return lensAttributes.getJSON('lnsXY', lastRefresh);
    // we also want to check the state on allSeries changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataViews, reportType, storage, theme, lastRefresh, allSeries, lensFormulaHelper]);
};
