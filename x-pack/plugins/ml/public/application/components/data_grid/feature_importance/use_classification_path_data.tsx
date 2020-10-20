/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { FeatureImportance, TopClasses } from '../../../../../common/types/feature_importance';
import { ExtendedFeatureImportance } from './decision_path_popover';

export type DecisionPathPlotData = Array<[string, number, number]>;

interface UseDecisionPathDataParams {
  featureImportance: FeatureImportance[];
  baseline?: number;
  predictedValue?: string | number | undefined;
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

export const isDecisionPathData = (decisionPathData: any): boolean => {
  return (
    Array.isArray(decisionPathData) &&
    decisionPathData.length > 0 &&
    decisionPathData[0].length === 3
  );
};

// cast to 'True' | 'False' | value to match Eui display
export const getStringBasedClassName = (v: string | boolean | undefined | number): string => {
  if (v === undefined) {
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

export const useDecisionPathData = ({
  baseline,
  featureImportance,
  predictedValue,
}: UseDecisionPathDataParams): { decisionPathData: DecisionPathPlotData | undefined } => {
  const decisionPathData = useMemo(() => {
    return baseline
      ? buildRegressionDecisionPathData({
          baseline,
          featureImportance,
          predictedValue: predictedValue as number | undefined,
        })
      : buildClassificationDecisionPathData({
          featureImportance,
          currentClass: predictedValue as string | undefined,
        });
  }, [baseline, featureImportance, predictedValue]);

  return { decisionPathData };
};

export const buildDecisionPathData = (featureImportance: ExtendedFeatureImportance[]) => {
  const finalResult: DecisionPathPlotData = featureImportance
    // sort so absolute importance so it goes from bottom (baseline) to top
    .sort(
      (a: ExtendedFeatureImportance, b: ExtendedFeatureImportance) =>
        b.absImportance! - a.absImportance!
    )
    .map((d) => [d[FEATURE_NAME] as string, d[FEATURE_IMPORTANCE] as number, NaN]);

  // start at the baseline and end at predicted value
  // for regression, cumulativeSum should add up to baseline
  let cumulativeSum = 0;
  for (let i = featureImportance.length - 1; i >= 0; i--) {
    cumulativeSum += finalResult[i][1];
    finalResult[i][2] = cumulativeSum;
  }
  return finalResult;
};
export const buildRegressionDecisionPathData = ({
  baseline,
  featureImportance,
  predictedValue,
}: RegressionDecisionPathProps): DecisionPathPlotData | undefined => {
  let mappedFeatureImportance: ExtendedFeatureImportance[] = featureImportance;
  mappedFeatureImportance = mappedFeatureImportance.map((d) => ({
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
    if (Math.abs(adjustedImportance) > 1e-5) {
      mappedFeatureImportance.push({
        [FEATURE_NAME]: i18n.translate(
          'xpack.ml.dataframe.analytics.decisionPathFeatureOtherTitle',
          {
            defaultMessage: 'other',
          }
        ),
        [FEATURE_IMPORTANCE]: adjustedImportance,
        absImportance: 0, // arbitrary importance so this will be of higher importance than baseline
      });
    }
  }
  const filteredFeatureImportance = mappedFeatureImportance.filter(
    (f) => f !== undefined
  ) as ExtendedFeatureImportance[];

  return buildDecisionPathData(filteredFeatureImportance);
};

export const buildClassificationDecisionPathData = ({
  featureImportance,
  currentClass,
}: {
  featureImportance: FeatureImportance[];
  currentClass: string | undefined;
}): DecisionPathPlotData | undefined => {
  if (currentClass === undefined) return [];
  const mappedFeatureImportance: Array<
    ExtendedFeatureImportance | undefined
  > = featureImportance.map((feature) => {
    const classFeatureImportance = Array.isArray(feature.classes)
      ? feature.classes.find((c) => getStringBasedClassName(c.class_name) === currentClass)
      : feature;
    if (classFeatureImportance && typeof classFeatureImportance[FEATURE_IMPORTANCE] === 'number') {
      return {
        [FEATURE_NAME]: feature[FEATURE_NAME],
        [FEATURE_IMPORTANCE]: classFeatureImportance[FEATURE_IMPORTANCE],
        absImportance: Math.abs(classFeatureImportance[FEATURE_IMPORTANCE] as number),
      };
    }
    return undefined;
  });
  const filteredFeatureImportance = mappedFeatureImportance.filter(
    (f) => f !== undefined
  ) as ExtendedFeatureImportance[];

  return buildDecisionPathData(filteredFeatureImportance);
};
