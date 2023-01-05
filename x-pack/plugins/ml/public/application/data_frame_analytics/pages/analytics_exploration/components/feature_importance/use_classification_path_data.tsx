/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import {
  ClassificationFeatureImportanceBaseline,
  FeatureImportance,
  FeatureImportanceBaseline,
  isClassificationFeatureImportanceBaseline,
  isRegressionFeatureImportanceBaseline,
  TopClasses,
} from '../../../../../../../common/types/feature_importance';
import type { ExtendedFeatureImportance } from './decision_path_popover';

export type DecisionPathPlotData = Array<[string, number, number]>;

interface UseDecisionPathDataParams {
  featureImportance: FeatureImportance[];
  baseline?: FeatureImportanceBaseline;
  predictedValue?: string | number | undefined;
  predictedProbability?: number | undefined;
  topClasses?: TopClasses;
}

interface RegressionDecisionPathProps {
  baseline?: number;
  predictedValue?: number | undefined;
  featureImportance: FeatureImportance[];
  topClasses?: TopClasses;
}
const FEATURE_NAME = 'feature_name';
const FEATURE_IMPORTANCE = 'importance';
const RESIDUAL_IMPORTANCE_ERROR_MARGIN = 1e-5;
const decisionPathFeatureOtherTitle = i18n.translate(
  'xpack.ml.dataframe.analytics.decisionPathFeatureOtherTitle',
  {
    defaultMessage: 'other',
  }
);
export const isDecisionPathData = (decisionPathData: any): boolean => {
  return (
    Array.isArray(decisionPathData) &&
    decisionPathData.length > 0 &&
    decisionPathData[0].length === 3
  );
};

// cast to 'True' | 'False' | value to match Eui display
export const getStringBasedClassName = (v: string | boolean | undefined | number): string => {
  if (v === undefined || v === null) {
    return '';
  }
  if (typeof v === 'boolean') {
    return v ? 'True' : 'False';
  }
  if (typeof v === 'number') {
    return v.toString();
  }
  return v;
};

export const formatValue = (number: number, precision = 3, fractionDigits = 1): string => {
  if (Math.abs(number) < 10) {
    return Number(number.toPrecision(precision)).toString();
  }
  return number.toFixed(fractionDigits);
};

export const useDecisionPathData = ({
  baseline,
  featureImportance,
  predictedValue,
  predictedProbability,
}: UseDecisionPathDataParams): { decisionPathData: DecisionPathPlotData | undefined } => {
  const decisionPathData = useMemo(() => {
    if (baseline === undefined) return;
    if (isRegressionFeatureImportanceBaseline(baseline)) {
      return buildRegressionDecisionPathData({
        baseline: baseline.baseline,
        featureImportance,
        predictedValue: predictedValue as number | undefined,
      });
    }
    if (isClassificationFeatureImportanceBaseline(baseline)) {
      return buildClassificationDecisionPathData({
        baselines: baseline.classes,
        featureImportance,
        currentClass: predictedValue as string | undefined,
        predictedProbability,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseline, featureImportance, predictedValue]);

  return { decisionPathData };
};

/**
 * Returns values to build decision path for regression jobs
 * where first data point of array is the final predicted value (end of decision path)
 */
export const buildRegressionDecisionPathData = ({
  baseline,
  featureImportance,
  predictedValue,
}: RegressionDecisionPathProps): DecisionPathPlotData | undefined => {
  const mappedFeatureImportance: ExtendedFeatureImportance[] = featureImportance.map((d) => ({
    ...d,
    absImportance: Math.abs(d[FEATURE_IMPORTANCE] as number),
  }));

  if (baseline && predictedValue !== undefined && Number.isFinite(predictedValue)) {
    // get the adjusted importance needed for when # of fields included in c++ analysis != max allowed
    // if num fields included = num features allowed exactly, adjustedImportance should be 0
    const adjustedImportance =
      predictedValue -
      mappedFeatureImportance.reduce(
        (accumulator, currentValue) => accumulator + currentValue.importance!,
        0
      ) -
      baseline;

    mappedFeatureImportance.push({
      [FEATURE_NAME]: i18n.translate(
        'xpack.ml.dataframe.analytics.decisionPathFeatureBaselineTitle',
        {
          defaultMessage: 'baseline',
        }
      ),
      [FEATURE_IMPORTANCE]: baseline,
      absImportance: -1,
    });

    // if the difference is small enough then no need to plot the residual feature importance
    if (Math.abs(adjustedImportance) > RESIDUAL_IMPORTANCE_ERROR_MARGIN) {
      mappedFeatureImportance.push({
        [FEATURE_NAME]: decisionPathFeatureOtherTitle,
        [FEATURE_IMPORTANCE]: adjustedImportance,
        absImportance: 0, // arbitrary importance so this will be of higher importance than baseline
      });
    }
  }
  const filteredFeatureImportance = mappedFeatureImportance.filter(
    (f) => f !== undefined
  ) as ExtendedFeatureImportance[];

  const finalResult: DecisionPathPlotData = filteredFeatureImportance
    // sort by absolute importance so it goes from bottom (baseline) to top
    .sort(
      (a: ExtendedFeatureImportance, b: ExtendedFeatureImportance) =>
        b.absImportance - a.absImportance
    )
    .map((d) => [d[FEATURE_NAME] as string, d[FEATURE_IMPORTANCE] as number, NaN]);

  // start at the baseline and end at predicted value
  // for regression, cumulativeSum should add up to baseline
  let cumulativeSum = 0;
  for (let i = filteredFeatureImportance.length - 1; i >= 0; i--) {
    cumulativeSum += finalResult[i][1];
    finalResult[i][2] = cumulativeSum;
  }
  return finalResult;
};

export const addAdjustedProbability = ({
  predictedProbability,
  decisionPlotData,
}: {
  predictedProbability: number | undefined;
  decisionPlotData: DecisionPathPlotData;
}): DecisionPathPlotData | undefined => {
  if (predictedProbability && decisionPlotData.length > 0) {
    const adjustedResidualImportance = predictedProbability - decisionPlotData[0][2];
    // in the case where the final prediction_probability is less than the actual predicted probability
    // which happens when number of features > top_num
    // adjust the path to account for the residual feature importance as well
    if (Math.abs(adjustedResidualImportance) > RESIDUAL_IMPORTANCE_ERROR_MARGIN) {
      decisionPlotData.forEach((row) => (row[2] = row[2] + adjustedResidualImportance));
      decisionPlotData.push([
        decisionPathFeatureOtherTitle,
        adjustedResidualImportance,
        decisionPlotData[decisionPlotData.length - 1][2] - adjustedResidualImportance,
      ]);
    }
  }
  return decisionPlotData;
};

export const processBinaryClassificationDecisionPathData = ({
  decisionPlotData,
  startingBaseline,
  predictedProbability,
}: {
  decisionPlotData: DecisionPathPlotData;
  startingBaseline: number;
  predictedProbability: number | undefined;
}): DecisionPathPlotData | undefined => {
  // array is arranged from final prediction at the top to the starting point at the bottom
  const finalResult = decisionPlotData;

  // transform the numbers into the probability space
  // starting with the baseline retrieved from trained_models metadata
  let logOddSoFar = startingBaseline;
  for (let i = finalResult.length - 1; i >= 0; i--) {
    logOddSoFar += finalResult[i][1];
    const predictionProbabilitySoFar = Math.exp(logOddSoFar) / (Math.exp(logOddSoFar) + 1);
    finalResult[i][2] = predictionProbabilitySoFar;
  }

  return addAdjustedProbability({ predictedProbability, decisionPlotData: finalResult });
};

export const processMultiClassClassificationDecisionPathData = ({
  baselines,
  decisionPlotData,
  startingBaseline,
  featureImportance,
  predictedProbability,
}: {
  baselines: ClassificationFeatureImportanceBaseline['classes'];
  decisionPlotData: DecisionPathPlotData;
  startingBaseline: number;
  featureImportance: FeatureImportance[];
  predictedProbability: number | undefined;
}): DecisionPathPlotData | undefined => {
  const denominator = computeMultiClassImportanceDenominator({ baselines, featureImportance });

  // calculate the probability path
  // p_j = exp(baseline(A) + \sum_{i=0}^j feature_importance_i(A)) / denominator
  const baseline = startingBaseline;
  let featureImportanceRunningSum = 0;
  for (let i = decisionPlotData.length - 1; i >= 0; i--) {
    featureImportanceRunningSum += decisionPlotData[i][1];
    const numerator = Math.exp(baseline + featureImportanceRunningSum);
    decisionPlotData[i][2] = numerator / denominator;
  }

  return addAdjustedProbability({ predictedProbability, decisionPlotData });
};

/**
 * Compute the denominator used for multiclass classification
 * (\sum_{x\in{A,B,C}} exp(baseline(x) + \sum_{i=0}^j feature_importance_i(x)))
 */
export const computeMultiClassImportanceDenominator = ({
  baselines,
  featureImportance,
}: {
  baselines: ClassificationFeatureImportanceBaseline['classes'];
  featureImportance: FeatureImportance[];
}): number => {
  let denominator = 0;
  for (let x = 0; x < baselines.length; x++) {
    let featureImportanceOfClassX = 0;
    for (let i = 0; i < featureImportance.length; i++) {
      const feature = featureImportance[i];
      const classFeatureImportance = Array.isArray(feature.classes)
        ? feature.classes.find(
            (c) =>
              getStringBasedClassName(c.class_name) ===
              getStringBasedClassName(baselines[x].class_name)
          )
        : feature;
      if (
        classFeatureImportance &&
        classFeatureImportance.importance !== undefined &&
        typeof classFeatureImportance[FEATURE_IMPORTANCE] === 'number'
      ) {
        featureImportanceOfClassX += classFeatureImportance.importance;
      }
    }
    denominator += Math.exp(baselines[x].baseline + featureImportanceOfClassX);
  }
  return denominator;
};

/**
 * Returns values to build decision path for classification jobs
 * where first data point of array is the final predicted probability (end of decision path)
 */
export const buildClassificationDecisionPathData = ({
  baselines,
  featureImportance,
  currentClass,
  predictedProbability,
}: {
  baselines: ClassificationFeatureImportanceBaseline['classes'];
  featureImportance: FeatureImportance[];
  currentClass: string | number | boolean | undefined;
  predictedProbability?: number | undefined;
}): DecisionPathPlotData | undefined => {
  if (currentClass === undefined || !(Array.isArray(baselines) && baselines.length >= 2)) return [];

  const mappedFeatureImportance: Array<ExtendedFeatureImportance | undefined> =
    featureImportance.map((feature) => {
      const classFeatureImportance = Array.isArray(feature.classes)
        ? feature.classes.find(
            (c) => getStringBasedClassName(c.class_name) === getStringBasedClassName(currentClass)
          )
        : feature;
      if (
        classFeatureImportance &&
        typeof classFeatureImportance[FEATURE_IMPORTANCE] === 'number'
      ) {
        return {
          [FEATURE_NAME]: feature[FEATURE_NAME],
          [FEATURE_IMPORTANCE]: classFeatureImportance[FEATURE_IMPORTANCE],
          absImportance: Math.abs(classFeatureImportance[FEATURE_IMPORTANCE] as number),
        };
      }
      return undefined;
    });

  // get the baseline for the current class from the trained_models metadata
  const baselineClass = baselines.find(
    (bl) => getStringBasedClassName(bl.class_name) === getStringBasedClassName(currentClass)
  );
  const startingBaseline = baselineClass?.baseline ? baselineClass?.baseline : 0;

  const filteredFeatureImportance = mappedFeatureImportance.filter(
    (f) => f !== undefined
  ) as ExtendedFeatureImportance[];

  const decisionPlotData: DecisionPathPlotData = filteredFeatureImportance
    // sort by absolute importance so it goes from bottom (baseline) to top
    .sort(
      (a: ExtendedFeatureImportance, b: ExtendedFeatureImportance) =>
        b.absImportance - a.absImportance
    )
    .map((d) => [d[FEATURE_NAME] as string, d[FEATURE_IMPORTANCE] as number, NaN]);

  // if binary classification
  if (baselines.length === 2) {
    return processBinaryClassificationDecisionPathData({
      startingBaseline,
      decisionPlotData,
      predictedProbability,
    });
  }
  // else if multiclass classification
  return processMultiClassClassificationDecisionPathData({
    baselines,
    decisionPlotData,
    startingBaseline,
    featureImportance,
    predictedProbability,
  });
};
