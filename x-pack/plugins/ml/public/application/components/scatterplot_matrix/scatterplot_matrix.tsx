/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useMemo, useEffect, useState, FC } from 'react';

// There is still an issue with Vega Lite's typings with the strict mode Kibana is using.
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

import { i18n } from '@kbn/i18n';

import type { SearchResponse7 } from '../../../../common/types/es_client';

import { ml } from '../../services/ml_api_service';

import { getProcessedFields } from '../data_grid';

import {
  getScatterplotMatrixVegaLiteSpec,
  LegendType,
  OUTLIER_SCORE_FIELD,
} from './scatterplot_matrix_vega_lite_spec';

import './scatterplot_matrix.scss';

const SCATTERPLOT_MATRIX_DEFAULT_FIELDS = 4;
const SCATTERPLOT_MATRIX_DEFAULT_FETCH_SIZE = 1000;
const SCATTERPLOT_MATRIX_DEFAULT_FETCH_MIN_SIZE = 1;
const SCATTERPLOT_MATRIX_DEFAULT_FETCH_MAX_SIZE = 10000;

const TOGGLE_ON = i18n.translate('xpack.ml.splom.toggleOn', {
  defaultMessage: 'On',
});
const TOGGLE_OFF = i18n.translate('xpack.ml.splom.toggleOff', {
  defaultMessage: 'Off',
});

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

  // dynamicSize is optionally used for outlier charts where the scatterplot marks
  // are sized according to outlier_score
  const [dynamicSize, setDynamicSize] = useState<boolean>(false);

  // used to give the use the option to customize the fields used for the matrix axes
  const [fields, setFields] = useState<string[]>(defaultFields);

  // the amount of documents to be fetched
  const [fetchSize, setFetchSize] = useState<number>(SCATTERPLOT_MATRIX_DEFAULT_FETCH_SIZE);
  // flag to add a random score to the ES query to fetch documents
  const [randomizeQuery, setRandomizeQuery] = useState<boolean>(false);

  const [isLoading, setIsLoading] = useState<boolean>(false);

  // contains the fetched documents and columns to be passed on to the Vega spec.
  const [splom, setSplom] = useState<{ items: any[]; columns: string[] } | undefined>();

  // formats the array of field names for EuiComboBox
  const fieldOptions = useMemo(
    () =>
      allFields.map((d) => ({
        label: d,
      })),
    [allFields]
  );

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

  useEffect(() => {
    async function fetchSplom(options: { didCancel: boolean }) {
      setIsLoading(true);
      try {
        const queryFields = [
          ...fields,
          ...(color !== undefined ? [color] : []),
          ...(legendType !== undefined ? [] : [`ml.${OUTLIER_SCORE_FIELD}`]),
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

          setSplom({ columns: fields, items });
          setIsLoading(false);
        }
      } catch (e) {
        // TODO error handling
        setIsLoading(false);
      }
    }

    const options = { didCancel: false };
    fetchSplom(options);
    return () => {
      options.didCancel = true;
    };
  }, [fetchSize, fields, index, randomizeQuery, resultsField]);

  const htmlId = useMemo(() => htmlIdGenerator()(), []);

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
            d[`ml.${OUTLIER_SCORE_FIELD}`] = 0;
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
              <EuiFormRow
                label={i18n.translate('xpack.ml.splom.fieldSelectionLabel', {
                  defaultMessage: 'Fields',
                })}
                display="rowCompressed"
                fullWidth
              >
                <EuiComboBox
                  compressed
                  fullWidth
                  placeholder={i18n.translate('xpack.ml.splom.fieldSelectionPlaceholder', {
                    defaultMessage: 'Select fields',
                  })}
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
              <EuiFormRow
                label={i18n.translate('xpack.ml.splom.SampleSizeLabel', {
                  defaultMessage: 'Sample size',
                })}
                display="rowCompressed"
                fullWidth
              >
                <EuiSelect
                  compressed
                  options={[
                    { value: 100, text: '100' },
                    { value: 1000, text: '1000' },
                    { value: 10000, text: '10000' },
                  ]}
                  value={fetchSize}
                  onChange={(e) => fetchSizeOnChange(e)}
                />
              </EuiFormRow>
            </EuiFlexItem>
            <EuiFlexItem style={{ width: '120px' }} grow={false}>
              <EuiFormRow
                label={i18n.translate('xpack.ml.splom.RandomScoringLabel', {
                  defaultMessage: 'Random scoring',
                })}
                display="rowCompressed"
                fullWidth
              >
                <EuiSwitch
                  name="mlScatterplotMatrixRandomizeQuery"
                  label={randomizeQuery ? TOGGLE_ON : TOGGLE_OFF}
                  checked={randomizeQuery}
                  onChange={() => randomizeQueryOnChange()}
                  disabled={isLoading}
                />
              </EuiFormRow>
            </EuiFlexItem>
            {resultsField !== undefined && legendType === undefined && (
              <EuiFlexItem style={{ width: '120px' }} grow={false}>
                <EuiFormRow
                  label={i18n.translate('xpack.ml.splom.dynamicSizeLabel', {
                    defaultMessage: 'Dynamic size',
                  })}
                  display="rowCompressed"
                  fullWidth
                >
                  <EuiSwitch
                    name="mlScatterplotMatrixDynamicSize"
                    label={dynamicSize ? TOGGLE_ON : TOGGLE_OFF}
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
