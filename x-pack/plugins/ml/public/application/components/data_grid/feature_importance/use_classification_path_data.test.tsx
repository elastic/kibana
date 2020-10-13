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

describe('useDecisionPathData', () => {
  test('buildRegressionDecisionPathData() should yield correct decision path', () => {
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
    if (result) {
      expect(result).toHaveLength(expectedFeatures.length);
      expect(expectedFeatures).toContain(result[0][0]);
      expect(result[0]).toHaveLength(3);
      expect(result[0][2]).toEqual(predictedValue);
    }
  });

  test('buildClassificationDecisionPathData() should yield correct prediction probability for binary classification', () => {
    const expectedResults = [
      { className: 'yes', probability: 0.35859594377154846 },
      { className: 'no', probability: 1 - 0.35859594377154846 },
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
      {
        feature_name: 'campaign',
        classes: [
          { importance: 0.1864125530511097, class_name: 'yes' },
          { importance: -0.1864125530511097, class_name: 'no' },
        ],
      },
      {
        feature_name: 'day.keyword',
        classes: [
          { importance: 0.10833579308137245, class_name: 'yes' },
          { importance: -0.10833579308137245, class_name: 'no' },
        ],
      },
      {
        feature_name: 'marital',
        classes: [
          { importance: -0.059747262953066954, class_name: 'yes' },
          { importance: 0.059747262953066954, class_name: 'no' },
        ],
      },
      {
        feature_name: 'contact',
        classes: [
          { importance: 0.05006565452601036, class_name: 'yes' },
          { importance: -0.05006565452601036, class_name: 'no' },
        ],
      },
      {
        feature_name: 'age',
        classes: [
          { importance: 0.03677719421872094, class_name: 'yes' },
          { importance: -0.03677719421872094, class_name: 'no' },
        ],
      },
      {
        feature_name: 'loan',
        classes: [
          { importance: 0.016961514664117754, class_name: 'yes' },
          { importance: -0.016961514664117754, class_name: 'no' },
        ],
      },
      {
        feature_name: 'pdays',
        classes: [
          { importance: -0.01424520652086994, class_name: 'yes' },
          { importance: 0.01424520652086994, class_name: 'no' },
        ],
      },
      {
        feature_name: 'month',
        classes: [
          { importance: 0.01060146662377572, class_name: 'yes' },
          { importance: -0.01060146662377572, class_name: 'no' },
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
      if (result) {
        expect(result).toHaveLength(featureImportanceData.length);
        expect(result[0]).toHaveLength(3);
        expect(featureNames).toContain(result[0][0]);
        expect(result[0][2]).toEqual(probability);
      }
    }
  });

  test('buildClassificationDecisionPathData() should yield correct prediction probability for multiclass classification', () => {
    const expectedResults = [{ className: 1, probability: 0.20242385407147057 }];
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
        {
          class_name: 3,
          baseline: 0.11260865992136031,
        },
        {
          class_name: 4,
          baseline: 0.17101777544722166,
        },
        {
          class_name: 5,
          baseline: -0.17734023637415797,
        },
        {
          class_name: 6,
          baseline: -0.5843550599798076,
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
          { importance: 0.4061864066015817, class_name: 3 },
          { importance: 0.35533017378922, class_name: 4 },
          { importance: -0.9481383994056365, class_name: 5 },
          { importance: -0.9541139436237829, class_name: 6 },
        ],
      },
      {
        feature_name: 'Cancelled',
        classes: [
          { importance: 0.0002822015809810556, class_name: 0 },
          { importance: -0.0033337017702255597, class_name: 1 },
          { importance: 0.0020744732163668696, class_name: 2 },
          { importance: -0.0008816135664711343, class_name: 3 },
          { importance: 0.0012343588349020519, class_name: 4 },
          { importance: 0.0020965769495432667, class_name: 5 },
          { importance: -0.0014722952450965433, class_name: 6 },
        ],
      },
      {
        feature_name: 'DistanceKilometers',
        classes: [
          { importance: 0.028472232240294063, class_name: 0 },
          { importance: 0.04119838646840895, class_name: 1 },
          { importance: 0.0662663363977551, class_name: 2 },
          { importance: 0.056756465412302594, class_name: 3 },
          { importance: 0.058986922653405126, class_name: 4 },
          { importance: -0.1169479743482489, class_name: 5 },
          { importance: -0.13473236882391615, class_name: 6 },
        ],
      },
      {
        feature_name: 'DistanceMiles',
        classes: [
          { importance: 0.010023333989674681, class_name: 0 },
          { importance: 0.018018253912887847, class_name: 1 },
          { importance: 0.004308668770426261, class_name: 2 },
          { importance: 0.029208421487506166, class_name: 3 },
          { importance: 0.03298448968564413, class_name: 4 },
          { importance: -0.026936061194631808, class_name: 5 },
          { importance: -0.06760710665150822, class_name: 6 },
        ],
      },
      {
        feature_name: 'FlightDelayMin',
        classes: [
          { importance: 0.012328665015678449, class_name: 0 },
          { importance: 0.00467283342248991, class_name: 1 },
          { importance: -0.009092344925845977, class_name: 2 },
          { importance: -0.00026272718631858906, class_name: 3 },
          { importance: 0.005580645564990073, class_name: 4 },
          { importance: -0.00032821953937444656, class_name: 5 },
          { importance: -0.012898852351619437, class_name: 6 },
        ],
      },
      {
        feature_name: 'FlightTimeMin',
        classes: [
          { importance: -0.0364090406152271, class_name: 0 },
          { importance: -0.06118895656512295, class_name: 1 },
          { importance: -0.09021891151732671, class_name: 2 },
          { importance: -0.03264111527228435, class_name: 3 },
          { importance: -0.12321866295101264, class_name: 4 },
          { importance: 0.18275576678867675, class_name: 5 },
          { importance: 0.16092092013229856, class_name: 6 },
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
      if (result) {
        expect(result).toHaveLength(featureImportanceData.length);
        expect(result[0]).toHaveLength(3);
        expect(featureNames).toContain(result[0][0]);
        expect(result[0][2]).toEqual(probability);
      }
    }
  });
});
