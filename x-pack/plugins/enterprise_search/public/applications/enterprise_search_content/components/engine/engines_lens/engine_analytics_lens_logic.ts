/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { kea, MakeLogicType } from 'kea';

import { DataView } from '@kbn/data-views-plugin/public';
import { FormulaPublicApi, TypedLensByValueInput } from '@kbn/lens-plugin/public';

import { getLensXYLensAttributes, getMetricLensAttributes } from './lens_data';

interface LensArguments {
  defaultDataView: DataView | null;
  formula: FormulaPublicApi;
  isNoResultsCardVisible?: boolean;
}
type LensResponse = TypedLensByValueInput['attributes'];

interface EngineAnalyticsLensValues {
  metricAttributesNoResults: LensResponse;
  metricAttributesQueries: LensResponse;
  resultMetricAttributesNoResults: LensResponse | null;
  resultMetricAttributesQueries: LensResponse | null;
  resultXYAttributes: LensResponse | null;
  xyAttributes: LensResponse;
}
interface EngineAnalyticsLensActions {
  getLensAreaAttributes: (args: LensArguments) => LensArguments;
  getLensMetricAttributes: (args: LensArguments) => LensArguments;
  setLensAreaAttributes: (resultXYAttributes: EngineAnalyticsLensValues['resultXYAttributes']) => {
    resultXYAttributes: EngineAnalyticsLensValues['resultXYAttributes'];
  };
  setLensMetricAttributesNoResults: (
    resultMetricAttributesNoResults: EngineAnalyticsLensValues['resultMetricAttributesNoResults']
  ) => {
    resultMetricAttributesNoResults: EngineAnalyticsLensValues['resultMetricAttributesNoResults'];
  };
  setLensMetricAttributesQueries: (
    resultMetricAttributesQueries: EngineAnalyticsLensValues['resultMetricAttributesQueries']
  ) => {
    resultMetricAttributesQueries: EngineAnalyticsLensValues['resultMetricAttributesQueries'];
  };
}

export const EngineAnalyticsLensLogic = kea<
  MakeLogicType<EngineAnalyticsLensValues, EngineAnalyticsLensActions>
>({
  actions: {
    getLensAreaAttributes: (args: LensArguments) => args,
    getLensMetricAttributes: (args: LensArguments) => args,
    setLensAreaAttributes: (resultXYAttributes: LensResponse) => ({
      resultXYAttributes,
    }),
    setLensMetricAttributesNoResults: (resultMetricAttributesNoResults: LensResponse) => ({
      resultMetricAttributesNoResults,
    }),
    setLensMetricAttributesQueries: (resultMetricAttributesQueries: LensResponse) => ({
      resultMetricAttributesQueries,
    }),
  },

  listeners: ({ actions }) => ({
    getLensAreaAttributes: (input) => {
      actions.setLensAreaAttributes(
        getLensXYLensAttributes(
          input.defaultDataView,
          input.formula,
          !input?.isNoResultsCardVisible
        )
      );
    },
    getLensMetricAttributes: (input) => {
      actions.setLensMetricAttributesQueries(
        getMetricLensAttributes(
          input.defaultDataView,
          input.formula,
          !input?.isNoResultsCardVisible
        )
      );
      actions.setLensMetricAttributesNoResults(
        getMetricLensAttributes(
          input.defaultDataView,
          input.formula,
          input?.isNoResultsCardVisible!
        )
      );
    },
  }),
  reducers: {
    resultMetricAttributesNoResults: [
      null,
      {
        setLensMetricAttributesNoResults: (_, { resultMetricAttributesNoResults }) =>
          resultMetricAttributesNoResults,
      },
    ],

    resultMetricAttributesQueries: [
      null,
      {
        setLensMetricAttributesQueries: (_, { resultMetricAttributesQueries }) =>
          resultMetricAttributesQueries,
      },
    ],

    resultXYAttributes: [
      null,
      {
        setLensAreaAttributes: (_, { resultXYAttributes }) => resultXYAttributes,
      },
    ],
  },
  selectors: ({ selectors }) => ({
    metricAttributesNoResults: [
      () => [selectors.resultMetricAttributesNoResults],
      (
        resultMetricAttributesNoResults: EngineAnalyticsLensValues['resultMetricAttributesNoResults']
      ) => resultMetricAttributesNoResults ?? null,
    ],

    metricAttributesQueries: [
      () => [selectors.resultMetricAttributesQueries],
      (resultMetricAttributesQueries: EngineAnalyticsLensValues['resultMetricAttributesQueries']) =>
        resultMetricAttributesQueries ?? null,
    ],

    xyAttributes: [
      () => [selectors.resultXYAttributes],
      (resultXYAttributes: EngineAnalyticsLensValues['resultXYAttributes']) =>
        resultXYAttributes ?? null,
    ],
  }),
});
