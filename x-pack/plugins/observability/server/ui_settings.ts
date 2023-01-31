/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { UiSettingsParams } from '@kbn/core/types';
import { i18n } from '@kbn/i18n';
import { observabilityFeatureId, ProgressiveLoadingQuality } from '../common';
import {
  enableComparisonByDefault,
  enableInspectEsQueries,
  maxSuggestions,
  defaultApmServiceEnvironment,
  apmProgressiveLoading,
  apmServiceInventoryOptimizedSorting,
  enableNewSyntheticsView,
  apmServiceGroupMaxNumberOfServices,
  apmTraceExplorerTab,
  apmLabsButton,
  enableAgentExplorerView,
  enableAwsLambdaMetrics,
  apmAWSLambdaPriceFactor,
  apmAWSLambdaRequestCostPerMillion,
  enableCriticalPath,
  enableInfrastructureHostsView,
  profilingElasticsearchPlugin,
} from '../common/ui_settings_keys';

const technicalPreviewLabel = i18n.translate(
  'xpack.observability.uiSettings.technicalPreviewLabel',
  { defaultMessage: 'technical preview' }
);

function feedbackLink({ href }: { href: string }) {
  return `<a href="${href}" target="_blank" rel="noopener noreferrer">${i18n.translate(
    'xpack.observability.uiSettings.giveFeedBackLabel',
    { defaultMessage: 'Give feedback' }
  )}</a>`;
}

type UiSettings = UiSettingsParams<boolean | number | string | object> & { showInLabs?: boolean };

/**
 * uiSettings definitions for Observability.
 */
export const uiSettings: Record<string, UiSettings> = {
  [enableNewSyntheticsView]: {
    category: [observabilityFeatureId],
    name: i18n.translate('xpack.observability.enableNewSyntheticsViewExperimentName', {
      defaultMessage: 'Enable new synthetic monitoring application',
    }),
    value: false,
    description: i18n.translate(
      'xpack.observability.enableNewSyntheticsViewExperimentDescriptionBeta',
      {
        defaultMessage:
          '{technicalPreviewLabel} Enable new synthetic monitoring application in observability. Refresh the page to apply the setting.',
        values: { technicalPreviewLabel: `<em>[${technicalPreviewLabel}]</em>` },
      }
    ),
    schema: schema.boolean(),
    requiresPageReload: true,
  },
  [enableInspectEsQueries]: {
    category: [observabilityFeatureId],
    name: i18n.translate('xpack.observability.enableInspectEsQueriesExperimentName', {
      defaultMessage: 'Inspect ES queries',
    }),
    value: false,
    description: i18n.translate('xpack.observability.enableInspectEsQueriesExperimentDescription', {
      defaultMessage: 'Inspect Elasticsearch queries in API responses.',
    }),
    schema: schema.boolean(),
    requiresPageReload: true,
  },
  [maxSuggestions]: {
    category: [observabilityFeatureId],
    name: i18n.translate('xpack.observability.maxSuggestionsUiSettingName', {
      defaultMessage: 'Maximum suggestions',
    }),
    value: 100,
    description: i18n.translate('xpack.observability.maxSuggestionsUiSettingDescription', {
      defaultMessage: 'Maximum number of suggestions fetched in autocomplete selection boxes.',
    }),
    schema: schema.number(),
  },
  [enableComparisonByDefault]: {
    category: [observabilityFeatureId],
    name: i18n.translate('xpack.observability.enableComparisonByDefault', {
      defaultMessage: 'Comparison feature',
    }),
    value: true,
    description: i18n.translate('xpack.observability.enableComparisonByDefaultDescription', {
      defaultMessage: 'Enable the comparison feature in APM app',
    }),
    schema: schema.boolean(),
  },
  [defaultApmServiceEnvironment]: {
    category: [observabilityFeatureId],
    sensitive: true,
    name: i18n.translate('xpack.observability.defaultApmServiceEnvironment', {
      defaultMessage: 'Default service environment',
    }),
    description: i18n.translate('xpack.observability.defaultApmServiceEnvironmentDescription', {
      defaultMessage:
        'Set the default environment for the APM app. When left empty, data from all environments will be displayed by default.',
    }),
    value: '',
    schema: schema.string(),
  },
  [apmProgressiveLoading]: {
    category: [observabilityFeatureId],
    name: i18n.translate('xpack.observability.apmProgressiveLoading', {
      defaultMessage: 'Use progressive loading of selected APM views',
    }),
    description: i18n.translate('xpack.observability.apmProgressiveLoadingDescription', {
      defaultMessage:
        '{technicalPreviewLabel} Whether to load data progressively for APM views. Data may be requested with a lower sampling rate first, with lower accuracy but faster response times, while the unsampled data loads in the background',
      values: { technicalPreviewLabel: `<em>[${technicalPreviewLabel}]</em>` },
    }),
    value: ProgressiveLoadingQuality.off,
    schema: schema.oneOf([
      schema.literal(ProgressiveLoadingQuality.off),
      schema.literal(ProgressiveLoadingQuality.low),
      schema.literal(ProgressiveLoadingQuality.medium),
      schema.literal(ProgressiveLoadingQuality.high),
    ]),
    requiresPageReload: false,
    type: 'select',
    options: [
      ProgressiveLoadingQuality.off,
      ProgressiveLoadingQuality.low,
      ProgressiveLoadingQuality.medium,
      ProgressiveLoadingQuality.high,
    ],
    optionLabels: {
      [ProgressiveLoadingQuality.off]: i18n.translate(
        'xpack.observability.apmProgressiveLoadingQualityOff',
        {
          defaultMessage: 'Off',
        }
      ),
      [ProgressiveLoadingQuality.low]: i18n.translate(
        'xpack.observability.apmProgressiveLoadingQualityLow',
        {
          defaultMessage: 'Low sampling rate (fastest, least accurate)',
        }
      ),
      [ProgressiveLoadingQuality.medium]: i18n.translate(
        'xpack.observability.apmProgressiveLoadingQualityMedium',
        {
          defaultMessage: 'Medium sampling rate',
        }
      ),
      [ProgressiveLoadingQuality.high]: i18n.translate(
        'xpack.observability.apmProgressiveLoadingQualityHigh',
        {
          defaultMessage: 'High sampling rate (slower, most accurate)',
        }
      ),
    },
    showInLabs: true,
  },
  [apmServiceInventoryOptimizedSorting]: {
    category: [observabilityFeatureId],
    name: i18n.translate('xpack.observability.apmServiceInventoryOptimizedSorting', {
      defaultMessage: 'Optimize services list load performance in APM',
    }),
    description: i18n.translate(
      'xpack.observability.apmServiceInventoryOptimizedSortingDescription',
      {
        defaultMessage:
          '{technicalPreviewLabel} Default APM Service Inventory and Storage Explorer pages sort (for Services without Machine Learning applied) to sort by Service Name. {feedbackLink}.',
        values: {
          technicalPreviewLabel: `<em>[${technicalPreviewLabel}]</em>`,
          feedbackLink: feedbackLink({ href: 'https://ela.st/feedback-apm-page-performance' }),
        },
      }
    ),
    schema: schema.boolean(),
    value: false,
    requiresPageReload: false,
    type: 'boolean',
    showInLabs: true,
  },
  [apmServiceGroupMaxNumberOfServices]: {
    category: [observabilityFeatureId],
    name: i18n.translate('xpack.observability.serviceGroupMaxServicesUiSettingName', {
      defaultMessage: 'Maximum services in a service group',
    }),
    value: 500,
    description: i18n.translate('xpack.observability.serviceGroupMaxServicesUiSettingDescription', {
      defaultMessage: 'Limit the number of services in a given service group',
    }),
    schema: schema.number({ min: 1 }),
  },
  [apmTraceExplorerTab]: {
    category: [observabilityFeatureId],
    name: i18n.translate('xpack.observability.apmTraceExplorerTab', {
      defaultMessage: 'APM Trace Explorer',
    }),
    description: i18n.translate('xpack.observability.apmTraceExplorerTabDescription', {
      defaultMessage:
        '{technicalPreviewLabel} Enable the APM Trace Explorer feature, that allows you to search and inspect traces with KQL or EQL. {feedbackLink}.',
      values: {
        technicalPreviewLabel: `<em>[${technicalPreviewLabel}]</em>`,
        feedbackLink: feedbackLink({ href: 'https://ela.st/feedback-trace-explorer' }),
      },
    }),
    schema: schema.boolean(),
    value: false,
    requiresPageReload: true,
    type: 'boolean',
    showInLabs: true,
  },
  [apmLabsButton]: {
    category: [observabilityFeatureId],
    name: i18n.translate('xpack.observability.apmLabs', {
      defaultMessage: 'Enable labs button in APM',
    }),
    description: i18n.translate('xpack.observability.apmLabsDescription', {
      defaultMessage:
        'This flag determines if the viewer has access to the Labs button, a quick way to enable and disable technical preview features in APM.',
    }),
    schema: schema.boolean(),
    value: false,
    requiresPageReload: true,
    type: 'boolean',
  },
  [enableInfrastructureHostsView]: {
    category: [observabilityFeatureId],
    name: i18n.translate('xpack.observability.enableInfrastructureHostsView', {
      defaultMessage: 'Infrastructure Hosts view',
    }),
    value: false,
    description: i18n.translate('xpack.observability.enableInfrastructureHostsViewDescription', {
      defaultMessage:
        '{technicalPreviewLabel} Enable the Hosts view in the Infrastructure app. {feedbackLink}.',
      values: {
        technicalPreviewLabel: `<em>[${technicalPreviewLabel}]</em>`,
        feedbackLink: feedbackLink({ href: 'https://ela.st/feedback-host-observability' }),
      },
    }),
    schema: schema.boolean(),
  },
  [enableAwsLambdaMetrics]: {
    category: [observabilityFeatureId],
    name: i18n.translate('xpack.observability.enableAwsLambdaMetrics', {
      defaultMessage: 'AWS Lambda Metrics',
    }),
    description: i18n.translate('xpack.observability.enableAwsLambdaMetricsDescription', {
      defaultMessage:
        '{technicalPreviewLabel} Display Amazon Lambda metrics in the service metrics tab. {feedbackLink}',
      values: {
        technicalPreviewLabel: `<em>[${technicalPreviewLabel}]</em>`,
        feedbackLink: feedbackLink({ href: 'https://ela.st/feedback-aws-lambda' }),
      },
    }),
    schema: schema.boolean(),
    value: true,
    requiresPageReload: true,
    type: 'boolean',
    showInLabs: true,
  },
  [enableAgentExplorerView]: {
    category: [observabilityFeatureId],
    name: i18n.translate('xpack.observability.enableAgentExplorer', {
      defaultMessage: 'Agent explorer',
    }),
    description: i18n.translate('xpack.observability.enableAgentExplorerDescription', {
      defaultMessage: '{technicalPreviewLabel} Enables Agent explorer view.',
      values: {
        technicalPreviewLabel: `<em>[${technicalPreviewLabel}]</em>`,
      },
    }),
    schema: schema.boolean(),
    value: false,
    requiresPageReload: true,
    type: 'boolean',
    showInLabs: true,
  },
  [apmAWSLambdaPriceFactor]: {
    category: [observabilityFeatureId],
    name: i18n.translate('xpack.observability.apmAWSLambdaPricePerGbSeconds', {
      defaultMessage: 'AWS lambda price factor',
    }),
    type: 'json',
    value: JSON.stringify({ x86_64: 0.0000166667, arm: 0.0000133334 }, null, 2),
    description: i18n.translate('xpack.observability.apmAWSLambdaPricePerGbSecondsDescription', {
      defaultMessage: 'Price per Gb-second.',
    }),
    schema: schema.object({
      arm: schema.number(),
      x86_64: schema.number(),
    }),
  },
  [apmAWSLambdaRequestCostPerMillion]: {
    category: [observabilityFeatureId],
    name: i18n.translate('xpack.observability.apmAWSLambdaRequestCostPerMillion', {
      defaultMessage: 'AWS lambda price per 1M requests',
    }),
    value: 0.2,
    schema: schema.number({ min: 0 }),
  },
  [enableCriticalPath]: {
    category: [observabilityFeatureId],
    name: i18n.translate('xpack.observability.enableCriticalPath', {
      defaultMessage: 'Critical path',
    }),
    description: i18n.translate('xpack.observability.enableCriticalPathDescription', {
      defaultMessage: '{technicalPreviewLabel} Optionally display the critical path of a trace.',
      values: {
        technicalPreviewLabel: `<em>[${technicalPreviewLabel}]</em>`,
      },
    }),
    schema: schema.boolean(),
    value: false,
    requiresPageReload: true,
    type: 'boolean',
    showInLabs: true,
  },
  [profilingElasticsearchPlugin]: {
    category: [observabilityFeatureId],
    name: i18n.translate('xpack.observability.profilingElasticsearchPlugin', {
      defaultMessage: 'Use Elasticsearch profiler plugin',
    }),
    description: i18n.translate('xpack.observability.profilingElasticsearchPluginDescription', {
      defaultMessage:
        '{technicalPreviewLabel} Whether to load stacktraces using Elasticsearch profiler plugin.',
      values: {
        technicalPreviewLabel: `<em>[${technicalPreviewLabel}]</em>`,
      },
    }),
    schema: schema.boolean(),
    value: true,
    requiresPageReload: true,
    type: 'boolean',
  },
};
