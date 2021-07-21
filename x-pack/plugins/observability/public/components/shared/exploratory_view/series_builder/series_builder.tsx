/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { RefObject, useEffect, useState } from 'react';
import { isEmpty } from 'lodash';
import { i18n } from '@kbn/i18n';
import {
  EuiBasicTable,
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiSwitch,
} from '@elastic/eui';
import { rgba } from 'polished';
import { AppDataType, SeriesConfig, ReportViewType, SeriesUrl } from '../types';
import { DataTypesCol } from './columns/data_types_col';
import { ReportTypesCol } from './columns/report_types_col';
import { ReportDefinitionCol } from './columns/report_definition_col';
import { ReportFilters } from './columns/report_filters';
import { ReportBreakdowns } from './columns/report_breakdowns';
import { NEW_SERIES_KEY, useSeriesStorage } from '../hooks/use_series_storage';
import { useAppIndexPatternContext } from '../hooks/use_app_index_pattern';
import { getDefaultConfigs } from '../configurations/default_configs';
import { SeriesEditor } from '../series_editor/series_editor';
import { SeriesActions } from '../series_editor/columns/series_actions';
import { euiStyled } from '../../../../../../../../src/plugins/kibana_react/common';
import { LastUpdated } from './last_updated';
import {
  CORE_WEB_VITALS_LABEL,
  DEVICE_DISTRIBUTION_LABEL,
  KPI_OVER_TIME_LABEL,
  PERF_DIST_LABEL,
} from '../configurations/constants/labels';

export interface ReportTypeItem {
  id: string;
  reportType: ReportViewType;
  label: string;
}

export const ReportTypes: Record<AppDataType, ReportTypeItem[]> = {
  synthetics: [
    { id: 'kpi', reportType: 'kpi-over-time', label: KPI_OVER_TIME_LABEL },
    { id: 'dist', reportType: 'data-distribution', label: PERF_DIST_LABEL },
  ],
  ux: [
    { id: 'kpi', reportType: 'kpi-over-time', label: KPI_OVER_TIME_LABEL },
    { id: 'dist', reportType: 'data-distribution', label: PERF_DIST_LABEL },
    { id: 'cwv', reportType: 'core-web-vitals', label: CORE_WEB_VITALS_LABEL },
  ],
  mobile: [
    { id: 'kpi', reportType: 'kpi-over-time', label: KPI_OVER_TIME_LABEL },
    { id: 'dist', reportType: 'data-distribution', label: PERF_DIST_LABEL },
    { id: 'mdd', reportType: 'device-data-distribution', label: DEVICE_DISTRIBUTION_LABEL },
  ],
  apm: [],
  infra_logs: [],
  infra_metrics: [],
};

interface BuilderItem {
  id: string;
  series: SeriesUrl;
  seriesConfig?: SeriesConfig;
}

export function SeriesBuilder({
  seriesBuilderRef,
  lastUpdated,
  multiSeries,
}: {
  seriesBuilderRef: RefObject<HTMLDivElement>;
  lastUpdated?: number;
  multiSeries?: boolean;
}) {
  const [editorItems, setEditorItems] = useState<BuilderItem[]>([]);
  const { getSeries, allSeries, allSeriesIds, setSeries, removeSeries } = useSeriesStorage();

  const { loading, indexPatterns } = useAppIndexPatternContext();

  useEffect(() => {
    const getDataViewSeries = (dataType: AppDataType, reportType: SeriesUrl['reportType']) => {
      if (indexPatterns?.[dataType]) {
        return getDefaultConfigs({
          dataType,
          indexPattern: indexPatterns[dataType],
          reportType: reportType!,
        });
      }
    };

    const seriesToEdit: BuilderItem[] =
      allSeriesIds
        .filter((sId) => {
          return allSeries?.[sId]?.isNew;
        })
        .map((sId) => {
          const series = getSeries(sId);
          const seriesConfig = getDataViewSeries(series.dataType, series.reportType);

          return { id: sId, series, seriesConfig };
        }) ?? [];
    const initSeries: BuilderItem[] = [{ id: 'series-id', series: {} as SeriesUrl }];
    setEditorItems(multiSeries || seriesToEdit.length > 0 ? seriesToEdit : initSeries);
  }, [allSeries, allSeriesIds, getSeries, indexPatterns, loading, multiSeries]);

  const columns = [
    {
      name: i18n.translate('xpack.observability.expView.seriesBuilder.dataType', {
        defaultMessage: 'Data Type',
      }),
      field: 'id',
      width: '15%',
      render: (seriesId: string) => <DataTypesCol seriesId={seriesId} />,
    },
    {
      name: i18n.translate('xpack.observability.expView.seriesBuilder.report', {
        defaultMessage: 'Report',
      }),
      width: '15%',
      field: 'id',
      render: (seriesId: string, { series: { dataType } }: BuilderItem) => (
        <ReportTypesCol seriesId={seriesId} reportTypes={dataType ? ReportTypes[dataType] : []} />
      ),
    },
    {
      name: i18n.translate('xpack.observability.expView.seriesBuilder.definition', {
        defaultMessage: 'Definition',
      }),
      width: '30%',
      field: 'id',
      render: (
        seriesId: string,
        { series: { dataType, reportType }, seriesConfig }: BuilderItem
      ) => {
        if (dataType && seriesConfig) {
          return loading ? (
            LOADING_VIEW
          ) : reportType ? (
            <ReportDefinitionCol seriesId={seriesId} seriesConfig={seriesConfig} />
          ) : (
            SELECT_REPORT_TYPE
          );
        }

        return null;
      },
    },
    {
      name: i18n.translate('xpack.observability.expView.seriesBuilder.filters', {
        defaultMessage: 'Filters',
      }),
      width: '20%',
      field: 'id',
      render: (seriesId: string, { series: { reportType }, seriesConfig }: BuilderItem) =>
        reportType && seriesConfig ? (
          <ReportFilters seriesId={seriesId} seriesConfig={seriesConfig} />
        ) : null,
    },
    {
      name: i18n.translate('xpack.observability.expView.seriesBuilder.breakdown', {
        defaultMessage: 'Breakdowns',
      }),
      width: '20%',
      field: 'id',
      render: (seriesId: string, { series: { reportType }, seriesConfig }: BuilderItem) =>
        reportType && seriesConfig ? (
          <ReportBreakdowns seriesId={seriesId} seriesConfig={seriesConfig} />
        ) : null,
    },
    ...(multiSeries
      ? [
          {
            name: i18n.translate('xpack.observability.expView.seriesBuilder.actions', {
              defaultMessage: 'Actions',
            }),
            align: 'center' as const,
            width: '10%',
            field: 'id',
            render: (seriesId: string, item: BuilderItem) => (
              <SeriesActions seriesId={seriesId} editorMode={true} />
            ),
          },
        ]
      : []),
  ];

  const applySeries = () => {
    editorItems.forEach(({ series, id: seriesId }) => {
      const { reportType, reportDefinitions, isNew, ...restSeries } = series;

      if (reportType && !isEmpty(reportDefinitions)) {
        const reportDefId = Object.values(reportDefinitions ?? {})[0];
        const newSeriesId = `${reportDefId}-${reportType}`;

        const newSeriesN: SeriesUrl = {
          ...restSeries,
          reportType,
          reportDefinitions,
        };

        setSeries(newSeriesId, newSeriesN);
        removeSeries(seriesId);
      }
    });
  };

  const addSeries = () => {
    const prevSeries = allSeries?.[allSeriesIds?.[0]];
    setSeries(
      `${NEW_SERIES_KEY}-${editorItems.length + 1}`,
      prevSeries
        ? ({ isNew: true, time: prevSeries.time } as SeriesUrl)
        : ({ isNew: true } as SeriesUrl)
    );
  };

  return (
    <Wrapper ref={seriesBuilderRef}>
      {multiSeries && (
        <EuiFlexGroup justifyContent="flexEnd" alignItems="center">
          <EuiFlexItem>
            <LastUpdated lastUpdated={lastUpdated} />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiSwitch
              label={i18n.translate('xpack.observability.expView.seriesBuilder.autoApply', {
                defaultMessage: 'Auto apply',
              })}
              checked={true}
              onChange={(e) => {}}
              compressed
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton onClick={() => applySeries()} isDisabled={true} size="s">
              {i18n.translate('xpack.observability.expView.seriesBuilder.apply', {
                defaultMessage: 'Apply changes',
              })}
            </EuiButton>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton color="secondary" onClick={() => addSeries()} size="s">
              {i18n.translate('xpack.observability.expView.seriesBuilder.addSeries', {
                defaultMessage: 'Add Series',
              })}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      )}
      <div>
        {multiSeries && <SeriesEditor />}
        {editorItems.length > 0 && (
          <EuiBasicTable
            items={editorItems}
            columns={columns}
            cellProps={{ style: { borderRight: '1px solid #d3dae6', verticalAlign: 'initial' } }}
            tableLayout="auto"
          />
        )}
        <EuiSpacer />
      </div>
    </Wrapper>
  );
}

const Wrapper = euiStyled.div`
  max-height: 50vh;
  overflow-y: scroll;
  overflow-x: clip;
  &::-webkit-scrollbar {
    height: ${({ theme }) => theme.eui.euiScrollBar};
    width: ${({ theme }) => theme.eui.euiScrollBar};
  }
  &::-webkit-scrollbar-thumb {
    background-clip: content-box;
    background-color: ${({ theme }) => rgba(theme.eui.euiColorDarkShade, 0.5)};
    border: ${({ theme }) => theme.eui.euiScrollBarCorner} solid transparent;
  }
  &::-webkit-scrollbar-corner,
  &::-webkit-scrollbar-track {
    background-color: transparent;
  }
`;

export const LOADING_VIEW = i18n.translate(
  'xpack.observability.expView.seriesBuilder.loadingView',
  {
    defaultMessage: 'Loading view ...',
  }
);

export const SELECT_REPORT_TYPE = i18n.translate(
  'xpack.observability.expView.seriesBuilder.selectReportType',
  {
    defaultMessage: 'No report type selected',
  }
);
