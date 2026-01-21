/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { ArtifactsSchema, TutorialSchema } from '@kbn/home-plugin/server';
import { TutorialsCategory } from '@kbn/home-plugin/server';
import type { CloudSetup } from '@kbn/cloud-plugin/server';
import type { APMIndices } from '@kbn/apm-sources-access-plugin/server';
import type { ObservabilityPluginSetup } from '@kbn/observability-plugin/server';
import type { APMConfig } from '..';
import { createElasticCloudInstructions } from './envs/elastic_cloud';
import { onPremInstructions } from './envs/on_prem';

const apmIntro = i18n.translate('xpack.apm.tutorial.introduction', {
  defaultMessage: 'Collect performance metrics from your applications with Elastic APM.',
});
const moduleName = 'apm';

export const tutorialProvider =
  ({
    apmConfig,
    apmIndices,
    cloud,
    isFleetPluginEnabled,
    observability,
    isManagedOtlpServiceFeatureEnabled,
    managedOtlpServiceUrl,
  }: {
    apmConfig: APMConfig;
    apmIndices: APMIndices;
    cloud?: CloudSetup;
    observability: ObservabilityPluginSetup;
    isFleetPluginEnabled: boolean;
    isManagedOtlpServiceFeatureEnabled: boolean;
    managedOtlpServiceUrl: string;
  }) =>
  () => {
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
        label: i18n.translate('xpack.apm.tutorial.specProvider.artifacts.application.label', {
          defaultMessage: 'Launch APM',
        }),
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
      longDescription: i18n.translate('xpack.apm.tutorial.specProvider.longDescription', {
        defaultMessage:
          'Application Performance Monitoring (APM) collects in-depth \
performance metrics and errors from inside your application. \
It allows you to monitor the performance of thousands of applications in real time. \
[Learn more]({learnMoreLink}).',
        values: {
          learnMoreLink:
            '{config.docs.base_url}guide/en/apm/guide/{config.docs.version}/index.html',
        },
      }),
      euiIconType: 'apmApp',
      integrationBrowserCategories: ['observability', 'apm'],
      artifacts,
      customStatusCheckName: 'apm_fleet_server_status_check',
      onPrem: onPremInstructions({ apmIndices, isFleetPluginEnabled }),
      elasticCloud: createElasticCloudInstructions({
        apmIndices,
        isFleetPluginEnabled,
        cloudSetup: cloud,
        isManagedOtlpServiceFeatureEnabled,
        managedOtlpServiceUrl,
      }),
      previewImagePath: '/plugins/apm/assets/apm.png',
    } as TutorialSchema;
  };
