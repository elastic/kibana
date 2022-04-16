/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import {
  ArtifactsSchema,
  TutorialsCategory,
  TutorialSchema,
} from '@kbn/home-plugin/server';
import { CloudSetup } from '@kbn/cloud-plugin/server';
import { APMConfig } from '..';
import { APM_STATIC_INDEX_PATTERN_ID } from '../../common/index_pattern_constants';
import { getApmDataViewAttributes } from '../routes/data_view/get_apm_data_view_attributes';
import { getApmDataViewTitle } from '../routes/data_view/get_apm_data_view_title';
import { ApmIndicesConfig } from '../routes/settings/apm_indices/get_apm_indices';
import { createElasticCloudInstructions } from './envs/elastic_cloud';
import { onPremInstructions } from './envs/on_prem';

const apmIntro = i18n.translate('xpack.apm.tutorial.introduction', {
  defaultMessage:
    'Collect performance metrics from your applications with Elastic APM.',
});
const moduleName = 'apm';

export const tutorialProvider =
  ({
    apmConfig,
    apmIndices,
    cloud,
    isFleetPluginEnabled,
  }: {
    apmConfig: APMConfig;
    apmIndices: ApmIndicesConfig;
    cloud?: CloudSetup;
    isFleetPluginEnabled: boolean;
  }) =>
  () => {
    const dataViewTitle = getApmDataViewTitle(apmIndices);
    const savedObjects = [
      {
        id: APM_STATIC_INDEX_PATTERN_ID,
        attributes: getApmDataViewAttributes(dataViewTitle),
        type: 'index-pattern',
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

    if (apmConfig.ui.enabled) {
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
      integrationBrowserCategories: ['web'],
      artifacts,
      customStatusCheckName: 'apm_fleet_server_status_check',
      onPrem: onPremInstructions({ apmConfig, isFleetPluginEnabled }),
      elasticCloud: createElasticCloudInstructions({
        apmConfig,
        isFleetPluginEnabled,
        cloudSetup: cloud,
      }),
      previewImagePath: '/plugins/apm/assets/apm.png',
      savedObjects,
      savedObjectsInstallMsg: i18n.translate(
        'xpack.apm.tutorial.specProvider.savedObjectsInstallMsg',
        {
          defaultMessage:
            'An APM data view is required for some features in the APM UI.',
        }
      ),
    } as TutorialSchema;
  };
