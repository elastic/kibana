/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { i18n } from '@kbn/i18n';
import { UiSettingsParams } from '@kbn/core/types';
import { observabilityFeatureId, ProgressiveLoadingQuality } from '../common';
import {
  enableComparisonByDefault,
  enableInspectEsQueries,
  maxSuggestions,
  defaultApmServiceEnvironment,
  apmProgressiveLoading,
  enableServiceGroups,
  apmServiceInventoryOptimizedSorting,
  enableNewSyntheticsView,
  apmServiceGroupMaxNumberOfServices,
  apmTraceExplorerTab,
  apmOperationsTab,
  apmLabsButton,
  enableInfrastructureHostsView,
  enableServiceMetrics,
  enableAwsLambdaMetrics,
  enableCriticalPath,
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

type UiSettings = UiSettingsParams<boolean | number | string> & { showInLabs?: boolean };

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
      'xpack.observability.enableNewSyntheticsViewExperimentDescription',
      {
        defaultMessage:
          'Enable new synthetic monitoring application in observability. Refresh the page to apply the setting.',
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
  [enableServiceGroups]: {
    category: [observabilityFeatureId],
    name: i18n.translate('xpack.observability.enableServiceGroups', {
      defaultMessage: 'Service groups feature',
    }),
    value: false,
    description: i18n.translate('xpack.observability.enableServiceGroupsDescription', {
      defaultMessage:
        '{technicalPreviewLabel} Enable the Service groups feature on APM UI. {feedbackLink}.',
      values: {
        technicalPreviewLabel: `<em>[${technicalPreviewLabel}]</em>`,
        feedbackLink: feedbackLink({ href: 'https://ela.st/feedback-service-groups' }),
      },
    }),
    schema: schema.boolean(),
    requiresPageReload: true,
    showInLabs: true,
  },
  [enableServiceMetrics]: {
    category: [observabilityFeatureId],
    name: i18n.translate('xpack.observability.apmEnableServiceMetrics', {
      defaultMessage: 'Service metrics',
    }),
    value: false,
    description: i18n.translate('xpack.observability.apmEnableServiceMetricsGroupsDescription', {
      defaultMessage:
        '{technicalPreviewLabel} Enables Service metrics. When is enabled, additional configuration in APM Server is required.',
      values: { technicalPreviewLabel: `<em>[${technicalPreviewLabel}]</em>` },
    }),
    schema: schema.boolean(),
    requiresPageReload: true,
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
  [apmOperationsTab]: {
    category: [observabilityFeatureId],
    name: i18n.translate('xpack.observability.apmOperationsBreakdown', {
      defaultMessage: 'APM Operations Breakdown',
    }),
    description: i18n.translate('xpack.observability.apmOperationsBreakdownDescription', {
      defaultMessage:
        '{technicalPreviewLabel} Enable the APM Operations Breakdown feature, that displays aggregates for backend operations. {feedbackLink}.',
      values: {
        technicalPreviewLabel: `<em>[${technicalPreviewLabel}]</em>`,
        feedbackLink: feedbackLink({ href: 'https://ela.st/feedback-operations-breakdown' }),
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
      defaultMessage: 'Enable the Hosts view in the Infrastructure app',
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
};
