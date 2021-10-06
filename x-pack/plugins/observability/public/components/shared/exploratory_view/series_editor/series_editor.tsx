/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiSpacer,
  EuiFormRow,
  EuiFlexItem,
  EuiFlexGroup,
  EuiButtonEmpty,
  EuiHorizontalRule,
} from '@elastic/eui';
import { rgba } from 'polished';
import { euiStyled } from './../../../../../../../../src/plugins/kibana_react/common';
import { AppDataType, ReportViewType, BuilderItem } from '../types';
import { SeriesContextValue, useSeriesStorage } from '../hooks/use_series_storage';
import { IndexPatternState, useAppIndexPatternContext } from '../hooks/use_app_index_pattern';
import { getDefaultConfigs } from '../configurations/default_configs';
import { ReportTypesSelect } from './columns/report_type_select';
import { ViewActions } from '../views/view_actions';
import { Series } from './series';

export interface ReportTypeItem {
  id: string;
  reportType: ReportViewType;
  label: string;
}

type ExpandedRowMap = Record<string, true>;

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

  return allSeries.map((series, seriesIndex) => {
    const seriesConfig = getDataViewSeries(series.dataType)!;

    return { id: seriesIndex, series, seriesConfig };
  });
};

export const SeriesEditor = React.memo(function () {
  const [editorItems, setEditorItems] = useState<BuilderItem[]>([]);

  const { getSeries, allSeries, reportType, removeSeries } = useSeriesStorage();

  const { loading, indexPatterns } = useAppIndexPatternContext();

  const [itemIdToExpandedRowMap, setItemIdToExpandedRowMap] = useState<Record<string, true>>({});

  const [{ prevCount, curCount }, setSeriesCount] = useState<{
    prevCount?: number;
    curCount: number;
  }>({
    curCount: allSeries.length,
  });

  useEffect(() => {
    setSeriesCount((oldParams) => ({ prevCount: oldParams.curCount, curCount: allSeries.length }));
    if (typeof prevCount !== 'undefined' && !isNaN(prevCount) && prevCount < curCount) {
      setItemIdToExpandedRowMap({});
    }
  }, [allSeries.length, curCount, prevCount]);

  useEffect(() => {
    const newExpandRows: ExpandedRowMap = {};

    setEditorItems((prevState) => {
      const newEditorItems = getSeriesToEdit({
        reportType,
        allSeries,
        indexPatterns,
      });

      newEditorItems.forEach(({ series, id }) => {
        const prevSeriesItem = prevState.find(({ id: prevId }) => prevId === id);
        if (
          prevSeriesItem &&
          series.selectedMetricField &&
          prevSeriesItem.series.selectedMetricField !== series.selectedMetricField
        ) {
          newExpandRows[id] = true;
        }
      });
      return [...newEditorItems];
    });

    setItemIdToExpandedRowMap((prevState) => {
      return { ...prevState, ...newExpandRows };
    });
  }, [allSeries, getSeries, indexPatterns, loading, reportType]);

  const toggleDetails = (item: BuilderItem) => {
    const itemIdToExpandedRowMapValues = { ...itemIdToExpandedRowMap };
    if (itemIdToExpandedRowMapValues[item.id]) {
      delete itemIdToExpandedRowMapValues[item.id];
    } else {
      itemIdToExpandedRowMapValues[item.id] = true;
    }
    setItemIdToExpandedRowMap(itemIdToExpandedRowMapValues);
  };

  const resetView = () => {
    const totalSeries = allSeries.length;
    for (let i = totalSeries; i >= 0; i--) {
      removeSeries(i);
    }
    setEditorItems([]);
    setItemIdToExpandedRowMap({});
  };

  return (
    <Wrapper>
      <div>
        <EuiFlexGroup>
          <EuiFlexItem grow={false}>
            <EuiFormRow label={REPORT_TYPE_LABEL} display="columnCompressed">
              <ReportTypesSelect />
            </EuiFormRow>
          </EuiFlexItem>
          {reportType && (
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty onClick={() => resetView()} color="text">
                {RESET_LABEL}
              </EuiButtonEmpty>
            </EuiFlexItem>
          )}
          <EuiFlexItem>
            <ViewActions onApply={() => setItemIdToExpandedRowMap({})} />
          </EuiFlexItem>
        </EuiFlexGroup>

        <EuiHorizontalRule margin="s" />
        {editorItems.map((item) => (
          <div key={item.id}>
            <Series
              item={item}
              toggleExpanded={() => toggleDetails(item)}
              isExpanded={itemIdToExpandedRowMap[item.id]}
            />
            <EuiSpacer size="s" />
          </div>
        ))}
        <EuiSpacer size="s" />
      </div>
    </Wrapper>
  );
});

const Wrapper = euiStyled.div`
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

export const RESET_LABEL = i18n.translate('xpack.observability.expView.seriesBuilder.reset', {
  defaultMessage: 'Reset',
});

export const REPORT_TYPE_LABEL = i18n.translate(
  'xpack.observability.expView.seriesBuilder.reportType',
  {
    defaultMessage: 'Report type',
  }
);
