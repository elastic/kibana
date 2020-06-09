/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useRef, useState } from 'react';
import ReactDOM from 'react-dom';

import { EuiDataGridColumn, EuiDataGridOnColumnResizeHandler } from '@elastic/eui';

import { mlDataGridChartClassName, ColumnChart } from './column_chart';
import { ChartData } from './use_column_chart';

const mlDataGridChartRowClassName = `${mlDataGridChartClassName}Row`;

type RefValue = HTMLElement | null;

export function useColumnCharts(columns: EuiDataGridColumn[], chartsData: ChartData[]) {
  const [histogramVisible, setHistogramVisible] = useState(false);

  const toggleHistogramVisibility = () => {
    setHistogramVisible(!histogramVisible);
  };

  const ref = useRef<RefValue>(null);

  const refFn = (node: RefValue) => {
    ref.current = node;

    if (node !== null) {
      const tBody = node.getElementsByClassName('euiDataGrid__content')[0];
      const chartRows = tBody.getElementsByClassName(mlDataGridChartRowClassName);

      let chartRow;
      if (chartRows.length > 0) {
        chartRow = chartRows[0];
        if (!histogramVisible) {
          chartRow.remove();
          const columnHeaders = tBody.getElementsByClassName('euiDataGridHeaderCell');
          for (let i = 0; i < columnHeaders.length; i++) {
            columnHeaders[i].classList.remove('mlDataGridHeaderCell--paddingChart');
          }
          return;
        }
      } else if (histogramVisible) {
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
          {columns.map((d, i) => {
            const chartData = chartsData.find((cd) => cd.id === d.id);
            return (
              <div
                key={d.id}
                className={`${mlDataGridChartClassName} ${mlDataGridChartClassName}-${i}`}
                style={{ width: `${d.initialWidth}px` }}
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
    if (ref !== null && ref.current !== null) {
      const columnIndex = columns.findIndex((c) => c.id === columnId);
      const chartElement = ref.current.querySelector(`.${mlDataGridChartClassName}-${columnIndex}`);
      if (chartElement !== null) {
        (chartElement as HTMLElement).style.width = `${width}px`;
      }
    }
  };

  return { columnResizeHandler, histogramVisible, refFn, toggleHistogramVisibility };
}
