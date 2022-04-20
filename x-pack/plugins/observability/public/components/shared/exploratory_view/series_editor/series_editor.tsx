/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiSpacer, EuiFormRow, EuiFlexItem, EuiFlexGroup } from '@elastic/eui';
import { rgba } from 'polished';
import { euiStyled } from '@kbn/kibana-react-plugin/common';
import { AppDataType, ReportViewType, BuilderItem } from '../types';
import { SeriesContextValue, useSeriesStorage } from '../hooks/use_series_storage';
import { DataViewState, useAppDataViewContext } from '../hooks/use_app_data_view';
import { getDefaultConfigs } from '../configurations/default_configs';
import { ReportTypesSelect } from './columns/report_type_select';
import { ViewActions } from '../views/view_actions';
import { Series } from './series';
import { ReportConfigMap, useExploratoryView } from '../contexts/exploratory_view_config';

export interface ReportTypeItem {
  id: string;
  reportType: ReportViewType;
  label: string;
}

type ExpandedRowMap = Record<string, true>;

export const getSeriesToEdit = ({
  dataViews,
  allSeries,
  reportType,
  reportConfigMap,
}: {
  allSeries: SeriesContextValue['allSeries'];
  dataViews: DataViewState;
  reportType: ReportViewType;
  reportConfigMap: ReportConfigMap;
}): BuilderItem[] => {
  const getDataViewSeries = (dataType: AppDataType) => {
    if (dataViews?.[dataType]) {
      return getDefaultConfigs({
        dataType,
        reportType,
        reportConfigMap,
        dataView: dataViews[dataType],
      });
    }
  };

  return allSeries.map((series, seriesIndex) => {
    const seriesConfig = getDataViewSeries(series.dataType);

    return { id: seriesIndex, series, seriesConfig };
  });
};

export const SeriesEditor = React.memo(function () {
  const [editorItems, setEditorItems] = useState<BuilderItem[]>([]);

  const { getSeries, allSeries, reportType } = useSeriesStorage();

  const { loading, dataViews } = useAppDataViewContext();

  const { reportConfigMap, setIsEditMode } = useExploratoryView();

  const [itemIdToExpandedRowMap, setItemIdToExpandedRowMap] = useState<Record<string, true>>({});

  const [{ prevCount, curCount }, setSeriesCount] = useState<{
    prevCount?: number;
    curCount: number;
  }>({
    curCount: allSeries.length,
  });

  useEffect(() => {
    setIsEditMode?.(Object.keys(itemIdToExpandedRowMap).length > 0);
  }, [itemIdToExpandedRowMap, setIsEditMode]);

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
        dataViews,
        reportConfigMap,
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
  }, [allSeries, getSeries, dataViews, loading, reportConfigMap, reportType]);

  const toggleDetails = (item: BuilderItem) => {
    const itemIdToExpandedRowMapValues = { ...itemIdToExpandedRowMap };
    if (itemIdToExpandedRowMapValues[item.id]) {
      delete itemIdToExpandedRowMapValues[item.id];
    } else {
      itemIdToExpandedRowMapValues[item.id] = true;
    }
    setItemIdToExpandedRowMap(itemIdToExpandedRowMapValues);
  };

  return (
    <Wrapper>
      <SectionHeaderBackground />
      <StickyFlexGroup gutterSize="none">
        <EuiFlexItem grow={false}>
          <EuiFormRow
            css={{ alignItems: 'center' }}
            aria-label={REPORT_TYPE_ARIA_LABEL}
            id="report-type-label"
            isDisabled={true}
          >
            <ReportTypesSelect prepend={REPORT_TYPE_LABEL} />
          </EuiFormRow>
        </EuiFlexItem>

        <EuiFlexItem>
          <ViewActions onApply={() => setItemIdToExpandedRowMap({})} />
        </EuiFlexItem>
      </StickyFlexGroup>

      <EditorRowsWrapper>
        {editorItems.map((item, index) => (
          <div key={item.id}>
            <Series
              item={item}
              toggleExpanded={() => toggleDetails(item)}
              isExpanded={itemIdToExpandedRowMap[item.id]}
            />
            {index + 1 !== editorItems.length && <EuiSpacer size="s" />}
          </div>
        ))}
      </EditorRowsWrapper>
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

const SectionHeaderBackground = euiStyled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 56px;
  background-color: ${({ theme }) => theme.eui.euiPageBackgroundColor};
  border-bottom: 1px solid ${({ theme }) => theme.eui.euiColorLightShade};
  z-index: 90;
`;

const StickyFlexGroup = euiStyled(EuiFlexGroup)`
  position: sticky;
  top: 0;
  z-index: 100;
  padding: 0;
`;

const EditorRowsWrapper = euiStyled.div`
  margin: ${({ theme }) => theme.eui.paddingSizes.m} 0;
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

export const REPORT_TYPE_LABEL = i18n.translate(
  'xpack.observability.expView.seriesBuilder.reportType',
  {
    defaultMessage: 'Report type',
  }
);

export const REPORT_TYPE_ARIA_LABEL = i18n.translate(
  'xpack.observability.expView.seriesBuilder.reportType.aria',
  {
    defaultMessage: 'This select allows you to choose the type of report you wish to create',
  }
);
