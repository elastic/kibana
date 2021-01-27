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
  EuiPanel,
  EuiSelect,
  EuiSwitch,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import type { SearchResponse7 } from '../../../../common/types/es_client';

import { useMlApiContext } from '../../contexts/kibana';

import { getProcessedFields } from '../data_grid';
import { useCurrentEuiTheme } from '../color_range_legend';

// import { ScatterplotMatrixLoading } from './scatterplot_matrix_loading';

import { getAucRocChartVegaLiteSpec } from './auc_roc_chart_vega_lite_spec';

// import './scatterplot_matrix_view.scss';

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

// export interface ScatterplotMatrixViewProps {
//   fields: string[];
//   index: string;
//   resultsField?: string;
//   color?: string;
//   legendType?: LegendType;
// }

export const AucRocChartView: FC = () => {
  const { esSearch } = useMlApiContext();

  // dynamicSize is optionally used for outlier charts where the scatterplot marks
  // are sized according to outlier_score
  const [dynamicSize, setDynamicSize] = useState<boolean>(false);

  // used to give the use the option to customize the fields used for the matrix axes
  const [fields, setFields] = useState<string[]>([]);

  // useEffect(() => {
  //   const defaultFields =
  //     allFields.length > SCATTERPLOT_MATRIX_DEFAULT_FIELDS
  //       ? allFields.slice(0, SCATTERPLOT_MATRIX_DEFAULT_FIELDS)
  //       : allFields;
  //   setFields(defaultFields);
  // }, [allFields]);

  // the amount of documents to be fetched
  const [fetchSize, setFetchSize] = useState<number>(SCATTERPLOT_MATRIX_DEFAULT_FETCH_SIZE);
  // flag to add a random score to the ES query to fetch documents
  const [randomizeQuery, setRandomizeQuery] = useState<boolean>(false);

  const [isLoading, setIsLoading] = useState<boolean>(false);

  // contains the fetched documents and columns to be passed on to the Vega spec.
  const [splom, setSplom] = useState<{ items: any[]; columns: string[] } | undefined>();

  // formats the array of field names for EuiComboBox
  // const fieldOptions = useMemo(
  //   () =>
  //     allFields.map((d) => ({
  //       label: d,
  //     })),
  //   [allFields]
  // );

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

  // useEffect(() => {
  //   async function fetchSplom(options: { didCancel: boolean }) {
  //     setIsLoading(true);
  //     try {
  //       const queryFields = [
  //         ...fields,
  //         ...(color !== undefined ? [color] : []),
  //         ...(legendType !== undefined ? [] : [`${resultsField}.${OUTLIER_SCORE_FIELD}`]),
  //       ];

  //       const query = randomizeQuery
  //         ? {
  //             function_score: {
  //               random_score: { seed: 10, field: '_seq_no' },
  //             },
  //           }
  //         : { match_all: {} };

  //       const resp: SearchResponse7 = await esSearch({
  //         index,
  //         body: {
  //           fields: queryFields,
  //           _source: false,
  //           query,
  //           from: 0,
  //           size: fetchSize,
  //         },
  //       });

  //       if (!options.didCancel) {
  //         const items = resp.hits.hits.map((d) =>
  //           getProcessedFields(d.fields, (key: string) =>
  //             key.startsWith(`${resultsField}.feature_importance`)
  //           )
  //         );

  //         setSplom({ columns: fields, items });
  //         setIsLoading(false);
  //       }
  //     } catch (e) {
  //       // TODO error handling
  //       setIsLoading(false);
  //     }
  //   }

  //   const options = { didCancel: false };
  //   fetchSplom(options);
  //   return () => {
  //     options.didCancel = true;
  //   };
  //   // stringify the fields array, otherwise the comparator will trigger on new but identical instances.
  // }, [fetchSize, JSON.stringify(fields), index, randomizeQuery, resultsField]);

  const htmlId = useMemo(() => htmlIdGenerator()(), []);

  useEffect(() => {
    const vegaSpec = getAucRocChartVegaLiteSpec();

    const vgSpec = compile(vegaSpec).spec;

    const view = new View(parse(vgSpec))
      .logLevel(Warn)
      .renderer('canvas')
      .tooltip(new Handler().call)
      .initialize(`#${htmlId}`);

    view.runAsync(); // evaluate and render the view
  }, []);

  return (
    <>
      <EuiPanel paddingSize="none" data-test-subj={`mlDFExpandableSection-1asdf`}>
        <div id={htmlId} className="mlScatterplotMatrix" data-test-subj="mlScatterplotMatrix" />
      </EuiPanel>
    </>
  );
};

// required for dynamic import using React.lazy()
// eslint-disable-next-line import/no-default-export
export default AucRocChartView;
