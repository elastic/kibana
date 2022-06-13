/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useEffect, useState, FC } from 'react';

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

import {
  EuiCallOut,
  EuiComboBox,
  EuiComboBoxOptionOption,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiIconTip,
  EuiSelect,
  EuiSpacer,
  EuiSwitch,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { DataView } from '@kbn/data-views-plugin/public';
import { extractErrorMessage } from '../../../../common';
import { isRuntimeMappings } from '../../../../common/util/runtime_field_utils';
import { stringHash } from '../../../../common/util/string_utils';
import { RuntimeMappings } from '../../../../common/types/fields';
import type { ResultsSearchQuery } from '../../data_frame_analytics/common/analytics';
import { getCombinedRuntimeMappings } from '../data_grid';

import { useMlApiContext } from '../../contexts/kibana';

import { getProcessedFields } from '../data_grid';
import { useCurrentEuiTheme } from '../color_range_legend';

// Separate imports for lazy loadable VegaChart and related code
import { VegaChart } from '../vega_chart';
import type { LegendType } from '../vega_chart/common';
import { VegaChartLoading } from '../vega_chart/vega_chart_loading';

import {
  getScatterplotMatrixVegaLiteSpec,
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

const sampleSizeOptions = [100, 1000, 10000].map((d) => ({ value: d, text: '' + d }));

interface OptionLabelWithIconTipProps {
  label: string;
  tooltip: string;
}

const OptionLabelWithIconTip: FC<OptionLabelWithIconTipProps> = ({ label, tooltip }) => (
  <>
    {label}
    <EuiIconTip
      content={tooltip}
      iconProps={{
        className: 'eui-alignTop',
      }}
      size="s"
    />
  </>
);

export interface ScatterplotMatrixProps {
  fields: string[];
  index: string;
  resultsField?: string;
  color?: string;
  legendType?: LegendType;
  searchQuery?: ResultsSearchQuery;
  runtimeMappings?: RuntimeMappings;
  indexPattern?: DataView;
}

export const ScatterplotMatrix: FC<ScatterplotMatrixProps> = ({
  fields: allFields,
  index,
  resultsField,
  color,
  legendType,
  searchQuery,
  runtimeMappings,
  indexPattern,
}) => {
  const { esSearch } = useMlApiContext();

  // dynamicSize is optionally used for outlier charts where the scatterplot marks
  // are sized according to outlier_score
  const [dynamicSize, setDynamicSize] = useState<boolean>(false);

  // used to give the user the option to customize the fields used for the matrix axes
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
  const [splom, setSplom] = useState<
    { items: any[]; columns: string[]; messages: string[] } | undefined
  >();

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
    if (fields.length === 0) {
      setSplom({ columns: [], items: [], messages: [] });
      setIsLoading(false);
      return;
    }

    async function fetchSplom(options: { didCancel: boolean }) {
      setIsLoading(true);
      const messages: string[] = [];

      try {
        const outlierScoreField = `${resultsField}.${OUTLIER_SCORE_FIELD}`;
        const includeOutlierScoreField = resultsField !== undefined;

        const queryFields = [
          ...fields,
          ...(color !== undefined ? [color] : []),
          ...(includeOutlierScoreField ? [outlierScoreField] : []),
        ];

        const query = randomizeQuery
          ? {
              function_score: {
                query: searchQuery,
                random_score: { seed: 10, field: '_seq_no' },
              },
            }
          : searchQuery;

        const combinedRuntimeMappings =
          indexPattern && getCombinedRuntimeMappings(indexPattern, runtimeMappings);

        const resp: estypes.SearchResponse = await esSearch({
          index,
          body: {
            fields: queryFields,
            _source: false,
            query,
            from: 0,
            size: fetchSize,
            ...(isRuntimeMappings(combinedRuntimeMappings)
              ? { runtime_mappings: combinedRuntimeMappings }
              : {}),
          },
        });

        if (!options.didCancel) {
          const items = resp.hits.hits
            .map((d) =>
              getProcessedFields(d.fields ?? {}, (key: string) =>
                key.startsWith(`${resultsField}.feature_importance`)
              )
            )
            .filter((d) => !Object.keys(d).some((field) => Array.isArray(d[field])));

          const originalDocsCount = resp.hits.hits.length;
          const filteredDocsCount = originalDocsCount - items.length;

          if (originalDocsCount === filteredDocsCount) {
            messages.push(
              i18n.translate('xpack.ml.splom.allDocsFilteredWarningMessage', {
                defaultMessage:
                  'All fetched documents included fields with arrays of values and cannot be visualized.',
              })
            );
          } else if (resp.hits.hits.length !== items.length) {
            messages.push(
              i18n.translate('xpack.ml.splom.arrayFieldsWarningMessage', {
                defaultMessage:
                  '{filteredDocsCount} out of {originalDocsCount} fetched documents include fields with arrays of values and cannot be visualized.',
                values: {
                  originalDocsCount,
                  filteredDocsCount,
                },
              })
            );
          }

          setSplom({ columns: fields, items, messages });
          setIsLoading(false);
        }
      } catch (e) {
        setIsLoading(false);
        setSplom({ columns: [], items: [], messages: [extractErrorMessage(e)] });
      }
    }

    const options = { didCancel: false };
    fetchSplom(options);
    return () => {
      options.didCancel = true;
    };
    // stringify the fields array and search, otherwise the comparator will trigger on new but identical instances.
  }, [fetchSize, JSON.stringify({ fields, searchQuery }), index, randomizeQuery, resultsField]);

  const vegaSpec = useMemo(() => {
    if (splom === undefined) {
      return;
    }

    const { items, columns } = splom;

    return getScatterplotMatrixVegaLiteSpec(
      items,
      columns,
      euiTheme,
      resultsField,
      color,
      legendType,
      dynamicSize
    );
  }, [resultsField, splom, color, legendType, dynamicSize]);

  return (
    <>
      {splom === undefined || vegaSpec === undefined ? (
        <VegaChartLoading />
      ) : (
        <div data-test-subj={`mlScatterplotMatrix ${isLoading ? 'loading' : 'loaded'}`}>
          <EuiFlexGroup>
            <EuiFlexItem>
              <EuiFormRow
                label={
                  <OptionLabelWithIconTip
                    label={i18n.translate('xpack.ml.splom.fieldSelectionLabel', {
                      defaultMessage: 'Fields',
                    })}
                    tooltip={i18n.translate('xpack.ml.splom.fieldSelectionInfoTooltip', {
                      defaultMessage: 'Pick fields to explore their relationships.',
                    })}
                  />
                }
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
                label={
                  <OptionLabelWithIconTip
                    label={i18n.translate('xpack.ml.splom.sampleSizeLabel', {
                      defaultMessage: 'Sample size',
                    })}
                    tooltip={i18n.translate('xpack.ml.splom.sampleSizeInfoTooltip', {
                      defaultMessage: 'Amount of documents to display in the scatterplot matrix.',
                    })}
                  />
                }
                display="rowCompressed"
                fullWidth
              >
                <EuiSelect
                  data-test-subj="mlScatterplotMatrixSampleSizeSelect"
                  compressed
                  options={sampleSizeOptions}
                  value={fetchSize}
                  onChange={fetchSizeOnChange}
                />
              </EuiFormRow>
            </EuiFlexItem>
            <EuiFlexItem style={{ width: '120px' }} grow={false}>
              <EuiFormRow
                label={
                  <OptionLabelWithIconTip
                    label={i18n.translate('xpack.ml.splom.randomScoringLabel', {
                      defaultMessage: 'Random scoring',
                    })}
                    tooltip={i18n.translate('xpack.ml.splom.randomScoringInfoTooltip', {
                      defaultMessage:
                        'Uses a function score query to get randomly selected documents as the sample.',
                    })}
                  />
                }
                display="rowCompressed"
                fullWidth
              >
                <EuiSwitch
                  data-test-subj="mlScatterplotMatrixRandomizeQuerySwitch"
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
                  label={
                    <OptionLabelWithIconTip
                      label={i18n.translate('xpack.ml.splom.dynamicSizeLabel', {
                        defaultMessage: 'Dynamic size',
                      })}
                      tooltip={i18n.translate('xpack.ml.splom.dynamicSizeInfoTooltip', {
                        defaultMessage: 'Scales the size of each point by its outlier score.',
                      })}
                    />
                  }
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

          {splom.messages.length > 0 && (
            <>
              <EuiSpacer size="m" />
              <EuiCallOut color="warning">
                {splom.messages.map((m) => (
                  <span key={stringHash(m)}>
                    {m}
                    <br />
                  </span>
                ))}
              </EuiCallOut>
            </>
          )}

          {splom.items.length > 0 && <VegaChart vegaSpec={vegaSpec} />}
        </div>
      )}
    </>
  );
};
