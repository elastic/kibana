/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { MouseEvent, useEffect, useState } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiBasicTable,
  EuiButtonIcon,
  EuiSpacer,
  EuiFormRow,
  EuiFlexItem,
  EuiFlexGroup,
  EuiButtonEmpty,
} from '@elastic/eui';
import { rgba } from 'polished';
import classNames from 'classnames';
import { isEmpty } from 'lodash';
import { euiStyled } from './../../../../../../../../src/plugins/kibana_react/common';
import { AppDataType, SeriesConfig, ReportViewType, SeriesUrl } from '../types';
import { ReportBreakdowns } from './columns/report_breakdowns';
import { SeriesContextValue, useSeriesStorage } from '../hooks/use_series_storage';
import { IndexPatternState, useAppIndexPatternContext } from '../hooks/use_app_index_pattern';
import { getDefaultConfigs } from '../configurations/default_configs';
import { SeriesActions } from '../series_viewer/columns/series_actions';
import { SeriesInfo } from '../series_viewer/columns/series_info';
import { DataTypesSelect } from './columns/data_type_select';
import { DatePickerCol } from './columns/date_picker_col';
import { ExpandedSeriesRow } from './expanded_series_row';
import { SeriesName } from '../series_viewer/columns/series_name';
import { ReportTypesSelect } from './columns/report_type_select';
import { ViewActions } from '../views/view_actions';
import { ReportMetricOptions } from './report_metric_options';
import { SeriesFooter } from './columns/series_footer';

export interface ReportTypeItem {
  id: string;
  reportType: ReportViewType;
  label: string;
}

export interface BuilderItem {
  id: string;
  order: number;
  series: SeriesUrl;
  seriesConfig: SeriesConfig;
}

type ExpandedRowMap = Record<string, JSX.Element>;

export const getSeriesToEdit = ({
  indexPatterns,
  allSeries,
  reportType,
}: {
  allSeries: SeriesContextValue['allSeries'];
  indexPatterns: IndexPatternState;
  reportType: ReportViewType;
}): BuilderItem[] => {
  const getDataViewSeries = (dataType: AppDataType) => {
    if (indexPatterns?.[dataType]) {
      return getDefaultConfigs({
        dataType,
        reportType,
        indexPattern: indexPatterns[dataType],
      });
    }
  };

  return allSeries
    .sort((a, b) => a.order - b.order)
    .map((series) => {
      const seriesConfig = getDataViewSeries(series.dataType)!;

      return { id: series.name, order: series.order, series, seriesConfig };
    });
};

export const SeriesEditor = React.memo(function ({}: {}) {
  const [editorItems, setEditorItems] = useState<BuilderItem[]>([]);

  const { getSeries, allSeries, reportType, removeSeries } = useSeriesStorage();

  const { loading, indexPatterns } = useAppIndexPatternContext();

  const [itemIdToExpandedRowMap, setItemIdToExpandedRowMap] = useState<Record<string, JSX.Element>>(
    {}
  );

  useEffect(() => {
    const newExpandRows: ExpandedRowMap = {};

    setEditorItems((prevState) => {
      const newEditorItems = getSeriesToEdit({
        reportType,
        allSeries,
        indexPatterns,
      });

      newEditorItems.forEach(({ series, id, seriesConfig }) => {
        const prevSeriesItem = prevState.find(({ id: prevId }) => prevId === id);
        if (
          prevSeriesItem &&
          prevSeriesItem.series.selectedMetricField !== series.selectedMetricField
        ) {
          newExpandRows[id] = <ExpandedSeriesRow seriesId={id} seriesConfig={seriesConfig} />;
        }
      });
      return newEditorItems;
    });

    setItemIdToExpandedRowMap((prevState) => {
      return { ...prevState, ...newExpandRows };
    });
  }, [allSeries, getSeries, indexPatterns, loading, reportType]);

  useEffect(() => {
    setItemIdToExpandedRowMap((prevState) => {
      const itemIdToExpandedRowMapValues = { ...prevState };

      editorItems.forEach((item) => {
        if (itemIdToExpandedRowMapValues[item.id]) {
          itemIdToExpandedRowMapValues[item.id] = (
            <ExpandedSeriesRow seriesId={item.id} seriesConfig={item.seriesConfig} />
          );
        }
      });
      return itemIdToExpandedRowMapValues;
    });
  }, [allSeries, editorItems]);

  const toggleDetails = (item: BuilderItem) => {
    const itemIdToExpandedRowMapValues = { ...itemIdToExpandedRowMap };
    if (itemIdToExpandedRowMapValues[item.id]) {
      delete itemIdToExpandedRowMapValues[item.id];
    } else {
      itemIdToExpandedRowMapValues[item.id] = (
        <ExpandedSeriesRow seriesId={item.id} seriesConfig={item.seriesConfig} />
      );
    }
    setItemIdToExpandedRowMap(itemIdToExpandedRowMapValues);
  };

  const columns = [
    {
      align: 'left' as const,
      width: '40px',
      isExpander: true,
      field: 'id',
      name: '',
      render: (id: string, item: BuilderItem) =>
        item.series.dataType && item.series.selectedMetricField ? (
          <EuiButtonIcon
            onClick={() => toggleDetails(item)}
            isDisabled={!item.series.dataType || !item.series.selectedMetricField}
            aria-label={itemIdToExpandedRowMap[item.id] ? 'Collapse' : 'Expand'}
            iconType={itemIdToExpandedRowMap[item.id] ? 'arrowUp' : 'arrowDown'}
          />
        ) : null,
    },
    {
      name: '',
      field: 'id',
      width: '40px',
      render: (seriesId: string, { seriesConfig, id }: BuilderItem) => (
        <SeriesInfo seriesId={seriesId} seriesConfig={seriesConfig} />
      ),
    },
    {
      name: i18n.translate('xpack.observability.expView.seriesEditor.name', {
        defaultMessage: 'Name',
      }),
      field: 'id',
      width: '20%',
      footer: <SeriesFooter allSeries={allSeries} />,
      render: (seriesId: string) => <SeriesName seriesId={seriesId} />,
    },
    {
      name: 'Data type',
      field: 'id',
      width: '15%',
      render: (seriesId: string) => <DataTypesSelect seriesId={seriesId} />,
    },
    {
      name: 'Report metric',
      field: 'id',
      width: '15%',
      render: (seriesId: string, { seriesConfig }: BuilderItem) => (
        <ReportMetricOptions metricOptions={seriesConfig?.metricOptions} seriesId={seriesId} />
      ),
    },
    {
      name: 'Date/Time',
      field: 'id',
      width: '27%',
      render: (seriesId: string, { series }: BuilderItem) =>
        series.dataType && series.selectedMetricField ? (
          <DatePickerCol seriesId={seriesId} />
        ) : null,
    },

    {
      name: i18n.translate('xpack.observability.expView.seriesBuilder.breakdownBy', {
        defaultMessage: 'Breakdown by',
      }),
      width: '10%',
      field: 'id',
      render: (seriesId: string, { series: { selectedMetricField }, seriesConfig }: BuilderItem) =>
        selectedMetricField ? (
          <ReportBreakdowns seriesId={seriesId} seriesConfig={seriesConfig} />
        ) : null,
    },

    {
      name: i18n.translate('xpack.observability.expView.seriesBuilder.actions', {
        defaultMessage: 'Actions',
      }),
      align: 'center' as const,
      width: '8%',
      field: 'id',
      render: (seriesId: string) => <SeriesActions seriesId={seriesId} editorMode={true} />,
    },
  ];

  const getRowProps = (item: BuilderItem) => {
    const { dataType, reportDefinitions, selectedMetricField } = item.series;

    return {
      className: classNames({
        isExpanded: itemIdToExpandedRowMap[item.id],
        isIncomplete: !dataType || isEmpty(reportDefinitions),
      }),
      ...(dataType && selectedMetricField
        ? {
            onClick: (evt: MouseEvent) => {
              const targetElem = evt.target as HTMLElement;

              if (
                targetElem.classList.contains('euiTableCellContent') &&
                targetElem.tagName !== 'BUTTON'
              ) {
                toggleDetails(item);
              }
            },
          }
        : {}),
    };
  };

  const resetView = () => {
    allSeries.forEach((seriesT) => {
      removeSeries(seriesT.name);
    });
  };

  return (
    <Wrapper>
      <StyledScrollDiv>
        <EuiSpacer />
        <EuiFlexGroup>
          <EuiFlexItem grow={false}>
            <EuiFormRow label="Report type" display="columnCompressed">
              <ReportTypesSelect />
            </EuiFormRow>
          </EuiFlexItem>
          {reportType && (
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty onClick={() => resetView()} color="text">
                Reset
              </EuiButtonEmpty>
            </EuiFlexItem>
          )}
          <EuiFlexItem>
            <ViewActions />
          </EuiFlexItem>
        </EuiFlexGroup>

        <EuiSpacer size="s" />

        {editorItems.length > 0 && (
          <EuiBasicTable
            loading={loading}
            items={editorItems}
            columns={columns}
            tableLayout="auto"
            itemIdToExpandedRowMap={itemIdToExpandedRowMap}
            isExpandable={true}
            itemId="id"
            rowProps={getRowProps}
          />
        )}
        <EuiSpacer />
      </StyledScrollDiv>
    </Wrapper>
  );
});

const StyledScrollDiv = euiStyled.div`

`;
const Wrapper = euiStyled.div`
  max-height: 50vh;
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

  &&& {
    .euiTableRow-isExpandedRow .euiTableRowCell {
      border-top: none;
      background-color: #FFFFFF;
      border-bottom: 2px solid #d3dae6;
      border-right: 2px solid rgb(211, 218, 230);
      border-left: 2px solid rgb(211, 218, 230);
    }

    .isExpanded {
      border-right: 2px solid rgb(211, 218, 230);
      border-left: 2px solid rgb(211, 218, 230);
      .euiTableRowCell {
        border-bottom: none;
      }
    }
    .isIncomplete .euiTableRowCell {
      background-color: rgba(254, 197, 20, 0.1);
    }
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
