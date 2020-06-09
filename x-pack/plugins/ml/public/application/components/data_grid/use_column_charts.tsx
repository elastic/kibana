/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useRef } from 'react';
import ReactDOM from 'react-dom';

import { EuiDataGridColumn, EuiDataGridOnColumnResizeHandler } from '@elastic/eui';

import { stringHash } from '../../../../common/util/string_utils';

import { mlDataGridChartClassName, ColumnChart } from './column_chart';
import { ChartData } from './use_column_chart';

const mlDataGridChartRowClassName = `${mlDataGridChartClassName}Row`;

type ColumnWidths = Record<string, number>;
type RefValue = HTMLElement | null;

export function useColumnCharts(
  columns: EuiDataGridColumn[],
  chartsData: ChartData[],
  chartsVisible: boolean
) {
  const ref = useRef<RefValue>(null);
  const refFn = (node: RefValue) => {
    renderCharts(node);
  };

  const renderCharts = (node: RefValue, columnsWidths?: ColumnWidths) => {
    ref.current = node;

    if (node !== null) {
      const tBody = node.getElementsByClassName('euiDataGrid__content')[0];
      const chartRows = tBody.getElementsByClassName(mlDataGridChartRowClassName);

      let chartRow;
      if (chartRows.length > 0) {
        chartRow = chartRows[0];
        if (!chartsVisible) {
          chartRow.remove();
          const columnHeaders = tBody.getElementsByClassName('euiDataGridHeaderCell');
          for (let i = 0; i < columnHeaders.length; i++) {
            columnHeaders[i].classList.remove('mlDataGridHeaderCell--paddingChart');
          }
          return;
        }
      } else if (chartsVisible) {
        chartRow = document.createElement('div');
        chartRow.classList.add(mlDataGridChartRowClassName);
        chartRow.classList.add('euiDataGridRow');
        tBody.insertBefore(chartRow, tBody.childNodes[0]);

        const columnHeaders = tBody.getElementsByClassName('euiDataGridHeaderCell');
        for (let i = 0; i < columnHeaders.length; i++) {
          columnHeaders[i].classList.add('mlDataGridHeaderCell--paddingChart');
        }
      } else {
        return;
      }

      ReactDOM.render(
        <>
          {columns.map((d) => {
            const chartData = chartsData.find((cd) => cd.id === d.id);
            const columnWidth = (columnsWidths && columnsWidths[d.id]) || d.initialWidth;
            return (
              <div
                key={d.id}
                className={`${mlDataGridChartClassName} ${mlDataGridChartClassName}-${stringHash(
                  d.id
                )}`}
                style={{ width: `${columnWidth}px` }}
              >
                {!d.isExpandable && chartData !== undefined && (
                  <ColumnChart chartData={chartData} columnType={d} />
                )}
              </div>
            );
          })}
        </>,
        chartRow
      );
    }
  };

  const columnResizeHandler: EuiDataGridOnColumnResizeHandler = ({ columnId, width }) => {
    const columnWidths = columns.reduce((p, c) => {
      if (columnId === c.id) {
        p[c.id] = width;
      } else if (ref !== null && ref.current !== null) {
        const chartElement = ref.current.querySelector(
          `.${mlDataGridChartClassName}-${stringHash(c.id)}`
        );
        p[c.id] =
          chartElement !== null ? (chartElement as HTMLElement).offsetWidth : c?.initialWidth ?? 0;
      }
      return p;
    }, {} as ColumnWidths);
    renderCharts(ref.current, columnWidths);
  };

  return { columnResizeHandler, refFn };
}
