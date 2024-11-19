/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { css } from '@emotion/react';

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import {
  EuiCallOut,
  EuiComboBox,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiIconTip,
  EuiLink,
  EuiSelect,
  EuiSpacer,
  EuiSwitch,
} from '@elastic/eui';

import rison from '@kbn/rison';
import { i18n } from '@kbn/i18n';
import type { Query } from '@kbn/data-plugin/common/query';
import type { DataView } from '@kbn/data-views-plugin/public';
import { stringHash } from '@kbn/ml-string-hash';
import { extractErrorMessage } from '@kbn/ml-error-utils';
import {
  getCombinedRuntimeMappings,
  isRuntimeMappings,
  type RuntimeMappings,
} from '@kbn/ml-runtime-field-utils';
import { getProcessedFields } from '@kbn/ml-data-grid';
import { euiThemeVars } from '@kbn/ui-theme';

import { useCurrentThemeVars, useMlApi, useMlKibana } from '../../contexts/kibana';

// Separate imports for lazy loadable VegaChart and related code
import { VegaChart } from '../vega_chart';
import type { LegendType } from '../vega_chart/common';
import { VegaChartLoading } from '../vega_chart/vega_chart_loading';

import {
  getScatterplotMatrixVegaLiteSpec,
  OUTLIER_SCORE_FIELD,
} from './scatterplot_matrix_vega_lite_spec';

const cssOverrides = css({
  // Prevent the chart from overflowing the container
  overflowX: 'auto',
  // Overrides for the outlier threshold slider
  '.vega-bind': {
    span: {
      fontSize: euiThemeVars.euiFontSizeXS,
      padding: `0 ${euiThemeVars.euiSizeXS}`,
    },
  },
});

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

function filterChartableItems(items: estypes.SearchHit[], resultsField?: string) {
  return (
    items
      .map((d) =>
        getProcessedFields(d.fields ?? {}, (key: string) =>
          key.startsWith(`${resultsField}.feature_importance`)
        )
      )
      .filter((d) => !Object.keys(d).some((field) => Array.isArray(d[field]))) ?? []
  );
}

export interface ScatterplotMatrixProps {
  fields: string[];
  index: string;
  resultsField?: string;
  color?: string;
  legendType?: LegendType;
  searchQuery?: estypes.QueryDslQueryContainer;
  runtimeMappings?: RuntimeMappings;
  dataView?: DataView;
  query?: Query;
}

export const ScatterplotMatrix: FC<ScatterplotMatrixProps> = ({
  fields: allFields,
  index,
  resultsField,
  color,
  legendType,
  searchQuery,
  runtimeMappings,
  dataView,
  query,
}) => {
  const { esSearch } = useMlApi();
  const kibana = useMlKibana();
  const {
    services: { application, data },
  } = kibana;
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
    { items: any[]; backgroundItems: any[]; columns: string[]; messages: string[] } | undefined
  >();

  const { euiTheme } = useCurrentThemeVars();

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

  const getCustomVisualizationLink = useCallback(() => {
    const { columns } = splom!;
    const outlierScoreField =
      resultsField !== undefined ? `${resultsField}.${OUTLIER_SCORE_FIELD}` : undefined;
    const vegaSpec = getScatterplotMatrixVegaLiteSpec(
      true,
      [],
      [],
      columns,
      euiTheme,
      resultsField,
      color,
      legendType,
      dynamicSize
    );

    vegaSpec.$schema = 'https://vega.github.io/schema/vega-lite/v5.json';
    vegaSpec.title = `Scatterplot matrix for ${index}`;

    const fieldsToFetch = [
      ...columns,
      // Add outlier_score field in fetch if it's available so custom visualization can use it
      ...(outlierScoreField ? [outlierScoreField] : []),
      // Add field to color code by in fetch so custom visualization can use it -  usually for classfication jobs
      ...(color ? [color] : []),
    ];

    vegaSpec.data = {
      url: {
        '%context%': true,
        ...(dataView?.timeFieldName ? { ['%timefield%']: `${dataView?.timeFieldName}` } : {}),
        index,
        body: {
          fields: fieldsToFetch,
          size: fetchSize,
          _source: false,
        },
      },
      format: { property: 'hits.hits' },
    };

    const globalState = encodeURIComponent(
      rison.encode({
        filters: data.query.filterManager.getFilters(),
        refreshInterval: data.query.timefilter.timefilter.getRefreshInterval(),
        time: data.query.timefilter.timefilter.getTime(),
      })
    );

    const appState = encodeURIComponent(
      rison.encode({
        filters: [],
        linked: false,
        query,
        uiState: {},
        vis: {
          aggs: [],
          params: {
            spec: JSON.stringify(vegaSpec, null, 2),
          },
        },
      })
    );

    const basePath = `/create?type=vega&_g=${globalState}&_a=${appState}`;

    return { path: basePath };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [splom]);

  useEffect(() => {
    if (fields.length === 0) {
      setSplom({ columns: [], items: [], backgroundItems: [], messages: [] });
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

        const foregroundQuery = randomizeQuery
          ? {
              function_score: {
                query: searchQuery,
                random_score: { seed: 10, field: '_seq_no' },
              },
            }
          : searchQuery;

        let backgroundQuery;
        // If it's not the default query then we do a background search excluding the current query
        if (
          searchQuery &&
          ((searchQuery.match_all && Object.keys(searchQuery.match_all).length > 0) ||
            (searchQuery.bool && Object.keys(searchQuery.bool).length > 0))
        ) {
          backgroundQuery = randomizeQuery
            ? {
                function_score: {
                  query: { bool: { must_not: [searchQuery] } },
                  random_score: { seed: 10, field: '_seq_no' },
                },
              }
            : { bool: { must_not: [searchQuery] } };
        }

        const combinedRuntimeMappings =
          dataView && getCombinedRuntimeMappings(dataView, runtimeMappings);

        const body = {
          fields: queryFields,
          _source: false,
          query: foregroundQuery,
          from: 0,
          size: fetchSize,
          ...(isRuntimeMappings(combinedRuntimeMappings)
            ? { runtime_mappings: combinedRuntimeMappings }
            : {}),
        };

        const promises = [
          esSearch({
            index,
            body,
          }),
        ];

        if (backgroundQuery) {
          promises.push(
            esSearch({
              index,
              body: { ...body, query: backgroundQuery },
            })
          );
        }

        const [foregroundResp, backgroundResp] = await Promise.all<estypes.SearchResponse>(
          promises
        );

        if (!options.didCancel) {
          const items = filterChartableItems(foregroundResp.hits.hits, resultsField);
          const backgroundItems = filterChartableItems(
            backgroundResp?.hits.hits ?? [],
            resultsField
          );

          const originalDocsCount = foregroundResp.hits.hits.length;
          const filteredDocsCount = originalDocsCount - items.length;

          if (originalDocsCount === filteredDocsCount) {
            messages.push(
              i18n.translate('xpack.ml.splom.allDocsFilteredWarningMessage', {
                defaultMessage:
                  'All fetched documents included fields with arrays of values and cannot be visualized.',
              })
            );
          } else if (foregroundResp.hits.hits.length !== items.length) {
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

          setSplom({ columns: fields, items, backgroundItems, messages });
          setIsLoading(false);
        }
      } catch (e) {
        setIsLoading(false);
        setSplom({
          columns: [],
          items: [],
          backgroundItems: [],
          messages: [extractErrorMessage(e)],
        });
      }
    }

    const options = { didCancel: false };
    fetchSplom(options);
    return () => {
      options.didCancel = true;
    };
    // stringify the fields array and search, otherwise the comparator will trigger on new but identical instances.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchSize, JSON.stringify({ fields, searchQuery }), index, randomizeQuery, resultsField]);

  const vegaSpec = useMemo(() => {
    if (splom === undefined) {
      return;
    }

    const { items, backgroundItems, columns } = splom;

    return getScatterplotMatrixVegaLiteSpec(
      false,
      items,
      backgroundItems,
      columns,
      euiTheme,
      resultsField,
      color,
      legendType,
      dynamicSize
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resultsField, splom, color, legendType, dynamicSize]);

  return (
    <>
      {splom === undefined || vegaSpec === undefined ? (
        <VegaChartLoading />
      ) : (
        <div
          data-test-subj={`mlScatterplotMatrix ${isLoading ? 'loading' : 'loaded'}`}
          css={cssOverrides}
        >
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
            {splom ? (
              <EuiFlexItem grow={false}>
                <EuiLink
                  onClick={async () => {
                    const customVisLink = getCustomVisualizationLink();
                    await application.navigateToApp('visualize#', {
                      path: customVisLink.path,
                      openInNewTab: false,
                    });
                  }}
                  data-test-subj="mlSplomExploreInCustomVisualizationLink"
                >
                  <EuiIconTip
                    content={i18n.translate('xpack.ml.splom.exploreInCustomVisualizationLabel', {
                      defaultMessage:
                        'Explore scatterplot charts in Vega based custom visualization',
                    })}
                    type="visVega"
                    size="l"
                  />
                </EuiLink>
              </EuiFlexItem>
            ) : null}
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

          {splom.items.length > 0 && (
            <>
              <VegaChart vegaSpec={vegaSpec} />
              {splom.backgroundItems.length ? (
                <>
                  <EuiSpacer size="s" />
                  <EuiFormRow
                    fullWidth
                    helpText={i18n.translate('xpack.ml.splom.backgroundLayerHelpText', {
                      defaultMessage:
                        "If the data points match your filter, they're shown in color; otherwise, they're blurred gray.",
                    })}
                  >
                    <></>
                  </EuiFormRow>
                </>
              ) : null}
            </>
          )}
        </div>
      )}
    </>
  );
};
