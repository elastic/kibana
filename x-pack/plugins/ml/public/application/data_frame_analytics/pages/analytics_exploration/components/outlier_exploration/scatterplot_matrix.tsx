/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect, useState, FC } from 'react';

// @ts-ignore
import * as vegaLite from 'vega-lite/build-es5/vega-lite';
// @ts-ignore
import * as vega from 'vega/build-es5/vega';

import { htmlIdGenerator } from '@elastic/eui';

import { EuiLoadingSpinner, EuiSpacer, EuiText } from '@elastic/eui';

import type { SearchResponse7 } from '../../../../../../../common/types/es_client';

import { getProcessedFields } from '../../../../../components/data_grid';

import { ml } from '../../../../../services/ml_api_service';

import scatterplotMatrixVegaLiteSpec from './scatterplot_matrix_vega_lite_spec.json';
import './scatterplot_matrix.scss';

interface ScatterplotMatrixProps {
  fields: string[];
  index: string;
  resultsField?: string;
}

export const ScatterplotMatrix: FC<ScatterplotMatrixProps> = ({ fields, index, resultsField }) => {
  const [splom, setSplom] = useState<{ items: any[]; columns: string[] } | undefined>();

  const fetchStats = async (options: { didCancel: boolean }) => {
    const analyzedFields = fields;
    try {
      const resp: SearchResponse7 = await ml.esSearch({
        index,
        body: {
          fields: [...analyzedFields, 'ml.outlier_score'],
          _source: false,
          query: { match_all: {} },
          from: 0,
          size: 1000,
        },
      });

      if (!options.didCancel) {
        const items = resp.hits.hits.map((d) =>
          getProcessedFields(d.fields, (key: string) =>
            key.startsWith(`${resultsField}.feature_importance`)
          )
        );

        setSplom({ columns: analyzedFields, items });
      }
    } catch (e) {
      // silent catch
    }
  };

  useEffect(() => {
    const options = { didCancel: false };
    fetchStats(options);
    return () => {
      options.didCancel = true;
    };
  }, [fields, index, resultsField]);

  const htmlId = htmlIdGenerator()();

  useEffect(() => {
    if (splom === undefined) {
      return;
    }

    const { items, columns: rawColumns } = splom;

    // Vega doesn't support dashes in attribute names
    const columns = rawColumns.map((column) => `${column.split('-').join('_')}`);
    columns.length = 3;

    // TODO we want more results than just what's visible in data grid
    scatterplotMatrixVegaLiteSpec.spec.data = {
      values:
        resultsField !== undefined
          ? items
          : items.map((d) => {
              d['ml.outlier_score'] = 0;
              return d;
            }),
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

    if (resultsField === undefined) {
      delete scatterplotMatrixVegaLiteSpec.spec.selection;
      delete scatterplotMatrixVegaLiteSpec.spec.encoding.color.condition;
      delete scatterplotMatrixVegaLiteSpec.spec.encoding.opacity.condition;
      delete scatterplotMatrixVegaLiteSpec.spec.encoding.size.condition;
      scatterplotMatrixVegaLiteSpec.spec.encoding.color.value = '#369';
    }

    const vgSpec = vegaLite.compile(scatterplotMatrixVegaLiteSpec).spec;

    const view = new vega.View(vega.parse(vgSpec))
      .logLevel(vega.Warn) // set view logging level
      .renderer('svg') // set render type (defaults to 'canvas')
      .initialize(`#${htmlId}`) // set parent DOM element
      .hover(); // enable hover event processing, *only call once*!

    view.runAsync(); // evaluate and render the view
  }, [splom]);

  return (
    <>
      {splom === undefined && (
        <EuiText textAlign="center">
          <EuiSpacer size="l" />
          <EuiLoadingSpinner size="l" />
          <EuiSpacer size="l" />
        </EuiText>
      )}
      {splom !== undefined && <div id={htmlId} className="mlScatterplotMatrix" />}
    </>
  );
};
