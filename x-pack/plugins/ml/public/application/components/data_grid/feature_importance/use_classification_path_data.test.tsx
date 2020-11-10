/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  buildClassificationDecisionPathData,
  buildRegressionDecisionPathData,
} from './use_classification_path_data';
import { FeatureImportance } from '../../../../../common/types/feature_importance';

describe('buildClassificationDecisionPathData()', () => {
  test('should return correct prediction probability for binary classification', () => {
    const expectedResults = [
      { className: 'yes', probability: 0.28564605871278403 },
      { className: 'no', probability: 1 - 0.28564605871278403 },
    ];
    const baselinesData = {
      classes: [
        {
          class_name: 'no',
          baseline: 3.228256450715653,
        },
        {
          class_name: 'yes',
          baseline: -3.228256450715653,
        },
      ],
    };
    const featureImportanceData: FeatureImportance[] = [
      {
        feature_name: 'duration',
        classes: [
          { importance: 2.9932577725789455, class_name: 'yes' },
          { importance: -2.9932577725789455, class_name: 'no' },
        ],
      },
      {
        feature_name: 'job',
        classes: [
          { importance: -0.8023759403354496, class_name: 'yes' },
          { importance: 0.8023759403354496, class_name: 'no' },
        ],
      },
      {
        feature_name: 'poutcome',
        classes: [
          { importance: 0.43319318839128396, class_name: 'yes' },
          { importance: -0.43319318839128396, class_name: 'no' },
        ],
      },
      {
        feature_name: 'housing',
        classes: [
          { importance: -0.3124436380550531, class_name: 'yes' },
          { importance: 0.3124436380550531, class_name: 'no' },
        ],
      },
    ];
    const featureNames = featureImportanceData.map((d) => d.feature_name);

    for (const { className, probability } of expectedResults) {
      const result = buildClassificationDecisionPathData({
        baselines: baselinesData.classes,
        featureImportance: featureImportanceData,
        currentClass: className,
      });
      expect(result).toBeDefined();
      expect(result).toHaveLength(featureNames.length);
      expect(featureNames).toContain(result![0][0]);
      expect(result![0]).toHaveLength(3);
      expect(result![0][2]).toEqual(probability);
    }
  });

  test('should return correct prediction probability for multiclass classification', () => {
    const expectedResults = [{ className: 1, probability: 0.3551929251919077 }];
    const baselinesData = {
      classes: [
        {
          class_name: 0,
          baseline: 0.1845274610161167,
        },
        {
          class_name: 1,
          baseline: 0.1331813646384272,
        },
        {
          class_name: 2,
          baseline: 0.1603600353308416,
        },
      ],
    };
    const featureImportanceData: FeatureImportance[] = [
      {
        feature_name: 'AvgTicketPrice',
        classes: [
          { importance: 0.34413545865934353, class_name: 0 },
          { importance: 0.4781222770431657, class_name: 1 },
          { importance: 0.31847802693610877, class_name: 2 },
        ],
      },
      {
        feature_name: 'Cancelled',
        classes: [
          { importance: 0.0002822015809810556, class_name: 0 },
          { importance: -0.0033337017702255597, class_name: 1 },
          { importance: 0.0020744732163668696, class_name: 2 },
        ],
      },
      {
        feature_name: 'DistanceKilometers',
        classes: [
          { importance: 0.028472232240294063, class_name: 0 },
          { importance: 0.04119838646840895, class_name: 1 },
          { importance: 0.0662663363977551, class_name: 2 },
        ],
      },
    ];
    const featureNames = featureImportanceData.map((d) => d.feature_name);

    for (const { className, probability } of expectedResults) {
      const result = buildClassificationDecisionPathData({
        baselines: baselinesData.classes,
        featureImportance: featureImportanceData,
        currentClass: className,
      });
      expect(result).toBeDefined();
      expect(result).toHaveLength(featureNames.length);
      expect(featureNames).toContain(result![0][0]);
      expect(result![0]).toHaveLength(3);
      expect(result![0][2]).toEqual(probability);
    }
  });
});
describe('buildRegressionDecisionPathData()', () => {
  test('should return correct decision path', () => {
    const predictedValue = 0.008000000000000005;
    const baseline = 0.01570748450465414;
    const featureImportanceData: FeatureImportance[] = [
      { feature_name: 'g1', importance: -0.01171550599313763 },
      { feature_name: 'tau4', importance: -0.01190799086101345 },
    ];
    const expectedFeatures = [
      ...featureImportanceData.map((d) => d.feature_name),
      'other',
      'baseline',
    ];

    const result = buildRegressionDecisionPathData({
      baseline,
      featureImportance: featureImportanceData,
      predictedValue: 0.008,
    });
    expect(result).toBeDefined();
    expect(result).toHaveLength(expectedFeatures.length);
    expect(result![0]).toHaveLength(3);
    expect(result![0][2]).toEqual(predictedValue);
  });

  test('buildClassificationDecisionPathData() should return correct prediction probability for binary classification', () => {
    const expectedResults = [
      { className: 'yes', probability: 0.28564605871278403 },
      { className: 'no', probability: 1 - 0.28564605871278403 },
    ];
    const baselinesData = {
      classes: [
        {
          class_name: 'no',
          baseline: 3.228256450715653,
        },
        {
          class_name: 'yes',
          baseline: -3.228256450715653,
        },
      ],
    };
    const featureImportanceData: FeatureImportance[] = [
      {
        feature_name: 'duration',
        classes: [
          { importance: 2.9932577725789455, class_name: 'yes' },
          { importance: -2.9932577725789455, class_name: 'no' },
        ],
      },
      {
        feature_name: 'job',
        classes: [
          { importance: -0.8023759403354496, class_name: 'yes' },
          { importance: 0.8023759403354496, class_name: 'no' },
        ],
      },
      {
        feature_name: 'poutcome',
        classes: [
          { importance: 0.43319318839128396, class_name: 'yes' },
          { importance: -0.43319318839128396, class_name: 'no' },
        ],
      },
      {
        feature_name: 'housing',
        classes: [
          { importance: -0.3124436380550531, class_name: 'yes' },
          { importance: 0.3124436380550531, class_name: 'no' },
        ],
      },
    ];
    const featureNames = featureImportanceData.map((d) => d.feature_name);

    for (const { className, probability } of expectedResults) {
      const result = buildClassificationDecisionPathData({
        baselines: baselinesData.classes,
        featureImportance: featureImportanceData,
        currentClass: className,
      });
      expect(result).toBeDefined();
      expect(result).toHaveLength(featureNames.length);
      expect(featureNames).toContain(result![0][0]);
      expect(result![0]).toHaveLength(3);
      expect(result![0][2]).toEqual(probability);
    }
  });

  test('buildClassificationDecisionPathData() should return correct prediction probability for multiclass classification', () => {
    const expectedResults = [{ className: 1, probability: 0.3551929251919077 }];
    const baselinesData = {
      classes: [
        {
          class_name: 0,
          baseline: 0.1845274610161167,
        },
        {
          class_name: 1,
          baseline: 0.1331813646384272,
        },
        {
          class_name: 2,
          baseline: 0.1603600353308416,
        },
      ],
    };
    const featureImportanceData: FeatureImportance[] = [
      {
        feature_name: 'AvgTicketPrice',
        classes: [
          { importance: 0.34413545865934353, class_name: 0 },
          { importance: 0.4781222770431657, class_name: 1 },
          { importance: 0.31847802693610877, class_name: 2 },
        ],
      },
      {
        feature_name: 'Cancelled',
        classes: [
          { importance: 0.0002822015809810556, class_name: 0 },
          { importance: -0.0033337017702255597, class_name: 1 },
          { importance: 0.0020744732163668696, class_name: 2 },
        ],
      },
      {
        feature_name: 'DistanceKilometers',
        classes: [
          { importance: 0.028472232240294063, class_name: 0 },
          { importance: 0.04119838646840895, class_name: 1 },
          { importance: 0.0662663363977551, class_name: 2 },
        ],
      },
    ];
    const featureNames = featureImportanceData.map((d) => d.feature_name);

    for (const { className, probability } of expectedResults) {
      const result = buildClassificationDecisionPathData({
        baselines: baselinesData.classes,
        featureImportance: featureImportanceData,
        currentClass: className,
      });
      expect(result).toBeDefined();
      expect(result).toHaveLength(featureNames.length);
      expect(featureNames).toContain(result![0][0]);
      expect(result![0]).toHaveLength(3);
      expect(result![0][2]).toEqual(probability);
    }
  });
});
