/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect, FC } from 'react';

// @ts-ignore
import * as vegaLite from 'vega-lite/build-es5/vega-lite';
// @ts-ignore
import * as vega from 'vega/build-es5/vega';

import { htmlIdGenerator } from '@elastic/eui';

import scatterplotMatrixVegaLiteSpec from './scatterplot_matrix_vega_lite_spec.json';
import './scatterplot_matrix.scss';

interface ScatterplotMatrix {
  items: Array<Record<string, any>>;
  columns: string[];
}

export const ScatterplotMatrix: FC<ScatterplotMatrix> = ({ items, columns: rawColumns }) => {
  const htmlId = htmlIdGenerator()();

  useEffect(() => {
    // Vega doesn't support dashes in attribute names
    const columns = rawColumns.map((column) => `${column.split('-').join('_')}`);
    columns.length = 3;

    // TODO we want more results than just what's visible in data grid
    scatterplotMatrixVegaLiteSpec.spec.data = {
      values: items,
    };

    scatterplotMatrixVegaLiteSpec.repeat = {
      column: columns,
      row: columns.slice().reverse(),
    };

    scatterplotMatrixVegaLiteSpec.transform = columns.map((column) => ({
      calculate: `datum['${column}']`,
      as: column,
    }));
    scatterplotMatrixVegaLiteSpec.transform.push({
      calculate: `datum['ml.outlier_score']`,
      as: 'outlier_score',
    });

    const vgSpec = vegaLite.compile(scatterplotMatrixVegaLiteSpec).spec;

    const view = new vega.View(vega.parse(vgSpec))
      .logLevel(vega.Warn) // set view logging level
      .renderer('svg') // set render type (defaults to 'canvas')
      .initialize(`#${htmlId}`) // set parent DOM element
      .hover(); // enable hover event processing, *only call once*!

    view.runAsync(); // evaluate and render the view
  }, [items, rawColumns]);

  return <div id={htmlId} className="mlScatterplotMatrix" />;
};
