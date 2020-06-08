/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useRef, useState } from 'react';
import ReactDOM from 'react-dom';

import { EuiDataGridColumn, EuiDataGridOnColumnResizeHandler } from '@elastic/eui';

import { mlDataGridChartClassName, ColumnChart } from './column_chart';

const mlDataGridChartRowClassName = `${mlDataGridChartClassName}Row`;

type RefValue = HTMLElement | null;

export function useColumnCharts(columns: EuiDataGridColumn[], api: any, indexPatternTitle: string) {
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
          return;
        }
      } else if (histogramVisible) {
        chartRow = document.createElement('div');
        chartRow.classList.add(mlDataGridChartRowClassName);
        chartRow.classList.add('euiDataGridRow');
        tBody.insertBefore(chartRow, tBody.childNodes[0]);
      } else {
        return;
      }

      const query = { match_all: {} };

      ReactDOM.render(
        <>
          {columns.map((d, i) => (
            <div
              key={d.id}
              className={`${mlDataGridChartClassName} ${mlDataGridChartClassName}-${i}`}
              style={{ width: `${d.initialWidth}px` }}
            >
              {!d.isExpandable && (
                <ColumnChart
                  indexPatternTitle={indexPatternTitle}
                  columnType={d}
                  query={query}
                  api={api}
                />
              )}
            </div>
          ))}
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
