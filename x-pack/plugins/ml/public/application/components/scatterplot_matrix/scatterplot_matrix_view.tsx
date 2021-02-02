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
  EuiSelect,
  EuiSwitch,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import type { SearchResponse7 } from '../../../../common/types/es_client';
import type { ResultsSearchQuery } from '../../data_frame_analytics/common/analytics';

import { useMlApiContext } from '../../contexts/kibana';

import { getProcessedFields } from '../data_grid';
import { useCurrentEuiTheme } from '../color_range_legend';

import { ScatterplotMatrixLoading } from './scatterplot_matrix_loading';

import {
  getScatterplotMatrixVegaLiteSpec,
  LegendType,
  OUTLIER_SCORE_FIELD,
} from './scatterplot_matrix_vega_lite_spec';

import './scatterplot_matrix_view.scss';

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

const sampleSizeOptions = [100, 1000, 10000].map((d) => ({ value: d, text: '' + d }));

export interface ScatterplotMatrixViewProps {
  fields: string[];
  index: string;
  resultsField?: string;
  color?: string;
  legendType?: LegendType;
  searchQuery?: ResultsSearchQuery;
}

export const ScatterplotMatrixView: FC<ScatterplotMatrixViewProps> = ({
  fields: allFields,
  index,
  resultsField,
  color,
  legendType,
  searchQuery,
}) => {
  const { esSearch } = useMlApiContext();

  // dynamicSize is optionally used for outlier charts where the scatterplot marks
  // are sized according to outlier_score
  const [dynamicSize, setDynamicSize] = useState<boolean>(false);

  // used to give the use the option to customize the fields used for the matrix axes
  const [fields, setFields] = useState<string[]>([]);

  useEffect(() => {
    const defaultFields =
      allFields.length > SCATTERPLOT_MATRIX_DEFAULT_FIELDS
        ? allFields.slice(0, SCATTERPLOT_MATRIX_DEFAULT_FIELDS)
        : allFields;
    setFields(defaultFields);
  }, [allFields]);

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

  const { euiTheme } = useCurrentEuiTheme();

  useEffect(() => {
    async function fetchSplom(options: { didCancel: boolean }) {
      setIsLoading(true);
      try {
        const queryFields = [
          ...fields,
          ...(color !== undefined ? [color] : []),
          ...(legendType !== undefined ? [] : [`${resultsField}.${OUTLIER_SCORE_FIELD}`]),
        ];

        const queryFallback = searchQuery !== undefined ? searchQuery : { match_all: {} };
        const query = randomizeQuery
          ? {
              function_score: {
                query: queryFallback,
                random_score: { seed: 10, field: '_seq_no' },
              },
            }
          : queryFallback;

        const resp: SearchResponse7 = await esSearch({
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
    // stringify the fields array and search, otherwise the comparator will trigger on new but identical instances.
  }, [fetchSize, JSON.stringify({ fields, searchQuery }), index, randomizeQuery, resultsField]);

  const htmlId = useMemo(() => htmlIdGenerator()(), []);

  useEffect(() => {
    if (splom === undefined) {
      return;
    }

    const { items, columns } = splom;

    const values =
      resultsField !== undefined
        ? items
        : items.map((d) => {
            d[`${resultsField}.${OUTLIER_SCORE_FIELD}`] = 0;
            return d;
          });

    const vegaSpec = getScatterplotMatrixVegaLiteSpec(
      values,
      columns,
      euiTheme,
      resultsField,
      color,
      legendType,
      dynamicSize
    );

    const vgSpec = compile(vegaSpec).spec;

    const view = new View(parse(vgSpec))
      .logLevel(Warn)
      .renderer('canvas')
      .tooltip(new Handler().call)
      .initialize(`#${htmlId}`);

    view.runAsync(); // evaluate and render the view
  }, [resultsField, splom, color, legendType, dynamicSize]);

  return (
    <>
      {splom === undefined ? (
        <ScatterplotMatrixLoading />
      ) : (
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
                label={i18n.translate('xpack.ml.splom.sampleSizeLabel', {
                  defaultMessage: 'Sample size',
                })}
                display="rowCompressed"
                fullWidth
              >
                <EuiSelect
                  compressed
                  options={sampleSizeOptions}
                  value={fetchSize}
                  onChange={fetchSizeOnChange}
                />
              </EuiFormRow>
            </EuiFlexItem>
            <EuiFlexItem style={{ width: '120px' }} grow={false}>
              <EuiFormRow
                label={i18n.translate('xpack.ml.splom.randomScoringLabel', {
                  defaultMessage: 'Random scoring',
                })}
                display="rowCompressed"
                fullWidth
              >
                <EuiSwitch
                  name="mlScatterplotMatrixRandomizeQuery"
                  label={randomizeQuery ? TOGGLE_ON : TOGGLE_OFF}
                  checked={randomizeQuery}
                  onChange={randomizeQueryOnChange}
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
                    onChange={dynamicSizeOnChange}
                    disabled={isLoading}
                  />
                </EuiFormRow>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>

          <div id={htmlId} className="mlScatterplotMatrix" data-test-subj="mlScatterplotMatrix" />
        </>
      )}
    </>
  );
};

// required for dynamic import using React.lazy()
// eslint-disable-next-line import/no-default-export
export default ScatterplotMatrixView;
