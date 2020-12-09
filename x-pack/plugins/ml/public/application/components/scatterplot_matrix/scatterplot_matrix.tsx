/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect, useState, FC } from 'react';

// There is still an issue with Vega Lite's typings with the strict mode we're using.
// @ts-ignore
import { compile } from 'vega-lite/build-es5/vega-lite';
import { parse, View, Warn } from 'vega';
import { Handler } from 'vega-tooltip';

import {
  htmlIdGenerator,
  EuiComboBox,
  EuiComboBoxOptionOption,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiLoadingSpinner,
  EuiSelect,
  EuiSpacer,
  EuiSwitch,
  EuiText,
} from '@elastic/eui';

import type { SearchResponse7 } from '../../../../common/types/es_client';

import { ml } from '../../services/ml_api_service';

import { getProcessedFields } from '../data_grid';

import { getScatterplotMatrixVegaLiteSpec, LegendType } from './scatterplot_matrix_vega_lite_spec';

import './scatterplot_matrix.scss';

const SCATTERPLOT_MATRIX_DEFAULT_FIELDS = 4;
const SCATTERPLOT_MATRIX_DEFAULT_FETCH_SIZE = 1000;
const SCATTERPLOT_MATRIX_DEFAULT_FETCH_MIN_SIZE = 1;
const SCATTERPLOT_MATRIX_DEFAULT_FETCH_MAX_SIZE = 10000;

interface ScatterplotMatrixProps {
  fields: string[];
  index: string;
  resultsField?: string;
  color?: string;
  legendType?: LegendType;
}

export const ScatterplotMatrix: FC<ScatterplotMatrixProps> = ({
  fields: allFields,
  index,
  resultsField,
  color,
  legendType,
}) => {
  const defaultFields =
    allFields.length > SCATTERPLOT_MATRIX_DEFAULT_FIELDS
      ? allFields.slice(0, SCATTERPLOT_MATRIX_DEFAULT_FIELDS)
      : allFields;

  const [dynamicSize, setDynamicSize] = useState<boolean>(false);
  const [fields, setFields] = useState<string[]>(defaultFields);
  const [fetchSize, setFetchSize] = useState<number>(SCATTERPLOT_MATRIX_DEFAULT_FETCH_SIZE);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [randomizeQuery, setRandomizeQuery] = useState<boolean>(false);
  const [splom, setSplom] = useState<{ items: any[]; columns: string[] } | undefined>();

  const fieldOptions = allFields.map((d) => ({
    label: d,
  }));

  const fieldsOnChange = (newFields: EuiComboBoxOptionOption[]) => {
    setFields(newFields.map((d) => d.label));
  };

  const fetchSizeOnChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFetchSize(
      Math.min(
        Math.max(parseInt(e.target.value, 10), SCATTERPLOT_MATRIX_DEFAULT_FETCH_MIN_SIZE),
        SCATTERPLOT_MATRIX_DEFAULT_FETCH_MAX_SIZE
      )
    );
  };

  const randomizeQueryOnChange = () => {
    setRandomizeQuery(!randomizeQuery);
  };

  const dynamicSizeOnChange = () => {
    setDynamicSize(!dynamicSize);
  };

  const fetchStats = async (options: { didCancel: boolean }) => {
    setIsLoading(true);
    const analyzedFields = fields;
    try {
      const queryFields = [
        ...analyzedFields,
        ...(color !== undefined ? [color] : []),
        ...(legendType !== undefined ? [] : ['ml.outlier_score']),
      ];

      const query = randomizeQuery
        ? {
            function_score: {
              random_score: { seed: 10, field: '_seq_no' },
            },
          }
        : { match_all: {} };

      const resp: SearchResponse7 = await ml.esSearch({
        index,
        body: {
          fields: queryFields,
          _source: false,
          query,
          from: 0,
          size: fetchSize,
        },
      });

      if (!options.didCancel) {
        const items = resp.hits.hits.map((d) =>
          getProcessedFields(d.fields, (key: string) =>
            key.startsWith(`${resultsField}.feature_importance`)
          )
        );

        setSplom({ columns: analyzedFields, items });
        setIsLoading(false);
      }
    } catch (e) {
      // silent catch
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const options = { didCancel: false };
    fetchStats(options);
    return () => {
      options.didCancel = true;
    };
  }, [fetchSize, fields, index, randomizeQuery, resultsField]);

  const htmlId = htmlIdGenerator()();

  useEffect(() => {
    if (splom === undefined) {
      return;
    }

    const { items, columns: rawColumns } = splom;

    // Vega doesn't support dashes in attribute names
    const columns = rawColumns.map((column) => `${column.split('-').join('_')}`);

    const values =
      resultsField !== undefined
        ? items
        : items.map((d) => {
            d['ml.outlier_score'] = 0;
            return d;
          });

    const vegaSpec = getScatterplotMatrixVegaLiteSpec(
      values,
      columns,
      resultsField !== undefined,
      color,
      legendType,
      dynamicSize
    );

    const vgSpec = compile(vegaSpec).spec;

    const view = new View(parse(vgSpec))
      .logLevel(Warn) // set view logging level
      .renderer('canvas') // set render type (defaults to 'canvas')
      .tooltip(new Handler().call)
      .initialize(`#${htmlId}`); // set parent DOM element

    view.runAsync(); // evaluate and render the view
  }, [resultsField, splom, color, legendType, dynamicSize]);

  return (
    <>
      {splom === undefined && (
        <EuiText textAlign="center">
          <EuiSpacer size="l" />
          <EuiLoadingSpinner size="l" />
          <EuiSpacer size="l" />
        </EuiText>
      )}
      {splom !== undefined && (
        <>
          <EuiFlexGroup>
            <EuiFlexItem>
              <EuiFormRow label="Fields" display="rowCompressed" fullWidth>
                <EuiComboBox
                  compressed
                  fullWidth
                  placeholder="Select fields"
                  options={fieldOptions}
                  selectedOptions={fields.map((d) => ({
                    label: d,
                  }))}
                  onChange={fieldsOnChange}
                  isClearable={true}
                  data-test-subj="mlScatterplotMatrixFieldsComboBox"
                />
              </EuiFormRow>
            </EuiFlexItem>
            <EuiFlexItem style={{ width: '200px' }} grow={false}>
              <EuiFormRow label="Sample size" display="rowCompressed" fullWidth>
                <EuiSelect
                  compressed
                  options={[
                    { value: 100, text: '100' },
                    { value: 1000, text: '1000' },
                    { value: 10000, text: '10000' },
                  ]}
                  value={fetchSize}
                  onChange={(e) => fetchSizeOnChange(e)}
                  aria-label="Use aria labels when no actual label is in use"
                />
              </EuiFormRow>
            </EuiFlexItem>
            <EuiFlexItem style={{ width: '120px' }} grow={false}>
              <EuiFormRow label="Random scoring" display="rowCompressed" fullWidth>
                <EuiSwitch
                  name="mlScatterplotMatrixRandomizeQuery"
                  label={randomizeQuery ? 'On' : 'Off'}
                  checked={randomizeQuery}
                  onChange={() => randomizeQueryOnChange()}
                  disabled={isLoading}
                />
              </EuiFormRow>
            </EuiFlexItem>
            {resultsField !== undefined && legendType === undefined && (
              <EuiFlexItem style={{ width: '120px' }} grow={false}>
                <EuiFormRow label="Dynamic size" display="rowCompressed" fullWidth>
                  <EuiSwitch
                    name="mlScatterplotMatrixDynamicSize"
                    label={dynamicSize ? 'On' : 'Off'}
                    checked={dynamicSize}
                    onChange={() => dynamicSizeOnChange()}
                    disabled={isLoading}
                  />
                </EuiFormRow>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>

          <div id={htmlId} className="mlScatterplotMatrix" />
        </>
      )}
    </>
  );
};
