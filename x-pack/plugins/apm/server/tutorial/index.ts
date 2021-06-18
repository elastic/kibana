/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { onPremInstructions } from './envs/on_prem';
import { createElasticCloudInstructions } from './envs/elastic_cloud';
import apmIndexPattern from './index_pattern.json';
import { CloudSetup } from '../../../cloud/server';
import {
  ArtifactsSchema,
  TutorialsCategory,
} from '../../../../../src/plugins/home/server';
import { APM_STATIC_INDEX_PATTERN_ID } from '../../common/index_pattern_constants';

const apmIntro = i18n.translate('xpack.apm.tutorial.introduction', {
  defaultMessage:
    'Collect in-depth performance metrics and errors from inside your applications.',
});
const moduleName = 'apm';

export const tutorialProvider = ({
  isEnabled,
  indexPatternTitle,
  indices,
  cloud,
}: {
  isEnabled: boolean;
  indexPatternTitle: string;
  cloud?: CloudSetup;
  indices: {
    errorIndices: string;
    transactionIndices: string;
    metricsIndices: string;
    sourcemapIndices: string;
    onboardingIndices: string;
  };
}) => () => {
  const savedObjects = [
    {
      ...apmIndexPattern,
      id: APM_STATIC_INDEX_PATTERN_ID,
      attributes: {
        ...apmIndexPattern.attributes,
        title: indexPatternTitle,
      },
    },
  ];

  const artifacts: ArtifactsSchema = {
    dashboards: [
      {
        id: '8d3ed660-7828-11e7-8c47-65b845b5cfb3',
        linkLabel: i18n.translate(
          'xpack.apm.tutorial.specProvider.artifacts.dashboards.linkLabel',
          {
            defaultMessage: 'APM dashboard',
          }
        ),
        isOverview: true,
      },
    ],
  };

  if (isEnabled) {
    // @ts-expect-error artifacts.application is readonly
    artifacts.application = {
      path: '/app/apm',
      label: i18n.translate(
        'xpack.apm.tutorial.specProvider.artifacts.application.label',
        {
          defaultMessage: 'Launch APM',
        }
      ),
    };
  }

  return {
    id: 'apm',
    name: i18n.translate('xpack.apm.tutorial.specProvider.name', {
      defaultMessage: 'APM',
    }),
    moduleName,
    category: TutorialsCategory.OTHER,
    shortDescription: apmIntro,
    longDescription: i18n.translate(
      'xpack.apm.tutorial.specProvider.longDescription',
      {
        defaultMessage:
          'Application Performance Monitoring (APM) collects in-depth \
performance metrics and errors from inside your application. \
It allows you to monitor the performance of thousands of applications in real time. \
[Learn more]({learnMoreLink}).',
        values: {
          learnMoreLink:
            '{config.docs.base_url}guide/en/apm/get-started/{config.docs.version}/index.html',
        },
      }
    ),
    euiIconType: 'apmApp',
    artifacts,
    onPrem: onPremInstructions(indices),
    elasticCloud: createElasticCloudInstructions(cloud),
    previewImagePath: '/plugins/apm/assets/apm.png',
    savedObjects,
    savedObjectsInstallMsg: i18n.translate(
      'xpack.apm.tutorial.specProvider.savedObjectsInstallMsg',
      {
        defaultMessage:
          'An APM index pattern is required for some features in the APM UI.',
      }
    ),
  };
};
