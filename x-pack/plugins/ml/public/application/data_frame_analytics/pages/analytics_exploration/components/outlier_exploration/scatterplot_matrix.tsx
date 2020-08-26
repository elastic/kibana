/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect, FC } from 'react';

import * as vegaLite from 'vega-lite/build-es5/vega-lite';
import * as vega from 'vega/build-es5/vega';

import { htmlIdGenerator } from '@elastic/eui';

import { UseIndexDataReturnType } from '../../../../../components/data_grid';

import scatterplotMatrixVegaLiteSpec from './scatterplot_matrix_vega_lite_spec.json';

export const ScatterplotMatrix: FC<UseIndexDataReturnType> = (props) => {
  const htmlId = htmlIdGenerator()();

  useEffect(() => {
    const columns = props.visibleColumns
      .filter((column) => {
        const columnInfo = props.columnsWithCharts.find(
          (columnWithChart) => columnWithChart.id === column
        );
        return column !== 'ml.outlier_score' && columnInfo?.schema === 'numeric';
      })
      .sort()
      .map((column) => column.split('-').join('_'));

    // TODO we want more results than just what's visible in data grid
    scatterplotMatrixVegaLiteSpec.spec.data = {
      values: props.tableItems.map((item) => {
        return Object.entries(item).reduce((p, [key, value]) => {
          const columnName = key.split('-').join('_');
          if (columns.includes(columnName)) {
            p[columnName] = value;
          }
          if (columnName === 'ml') {
            p.ml = { outlier_score: item.ml.outlier_score };
          }
          return p;
        }, {} as Record<string, any>);
      }),
    };

    scatterplotMatrixVegaLiteSpec.repeat = {
      column: columns,
      row: columns.slice().reverse(),
    };

    scatterplotMatrixVegaLiteSpec.transform = columns.map((column) => ({
      calculate: `datum.${column}`,
      as: column,
    }));

    const vgSpec = vegaLite.compile(scatterplotMatrixVegaLiteSpec).spec;

    const view = new vega.View(vega.parse(vgSpec))
      .logLevel(vega.Warn) // set view logging level
      .renderer('svg') // set render type (defaults to 'canvas')
      .initialize(`#${htmlId}`) // set parent DOM element
      .hover(); // enable hover event processing, *only call once*!

    view.runAsync(); // evaluate and render the view
  }, [props.tableItems, props.visibleColumns]);

  return <div id={htmlId} />;
};
