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
  apmServiceGroupMaxNumberOfServices,
  apmTraceExplorerTab,
  apmLabsButton,
  enableAgentExplorerView,
  apmEnableTableSearchBar,
  entityCentricExperience,
  enableAwsLambdaMetrics,
  apmAWSLambdaPriceFactor,
  apmAWSLambdaRequestCostPerMillion,
  apmEnableServiceMetrics,
  apmEnableContinuousRollups,
  enableCriticalPath,
  enableInfrastructureHostsView,
  syntheticsThrottlingEnabled,
  enableLegacyUptimeApp,
  apmEnableProfilingIntegration,
  profilingShowErrorFrames,
  profilingCo2PerKWH,
  profilingDatacenterPUE,
  profilingPervCPUWattX86,
  profilingPervCPUWattArm64,
  profilingAWSCostDiscountRate,
  profilingCostPervCPUPerHour,
  profilingAzureCostDiscountRate,
  enableInfrastructureProfilingIntegration,
  apmEnableTransactionProfiling,
  enableInfrastructureAssetCustomDashboards,
  apmEnableServiceInventoryTableSearchBar,
  profilingFetchTopNFunctionsFromStacktraces,
  enableInfrastructureContainerAssetView,
} from '../common/ui_settings_keys';

const betaLabel = i18n.translate('xpack.observability.uiSettings.betaLabel', {
  defaultMessage: 'beta',
});

const technicalPreviewLabel = i18n.translate(
  'xpack.observability.uiSettings.technicalPreviewLabel',
  { defaultMessage: 'technical preview' }
);

type UiSettings = UiSettingsParams<boolean | number | string | object> & { showInLabs?: boolean };

/**
 * uiSettings definitions for Observability.
 */
export const uiSettings: Record<string, UiSettings> = {
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
      defaultMessage:
        'Determines whether the comparison feature is enabled or disabled by default in the APM app.',
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
          '{technicalPreviewLabel} Default APM Service Inventory and Storage Explorer pages sort (for Services without Machine Learning applied) to sort by Service Name.',
        values: {
          technicalPreviewLabel: `<em>[${technicalPreviewLabel}]</em>`,
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
        '{technicalPreviewLabel} Enable the APM Trace Explorer feature, that allows you to search and inspect traces with KQL or EQL. {link}',
      values: {
        technicalPreviewLabel: `<em>[${technicalPreviewLabel}]</em>`,
        link: traceExplorerDocsLink({
          href: 'https://www.elastic.co/guide/en/kibana/master/traces.html#trace-explorer',
        }),
      },
    }),
    schema: schema.boolean(),
    value: true,
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
    value: true,
    description: i18n.translate('xpack.observability.enableInfrastructureHostsViewDescription', {
      defaultMessage: '{betaLabel} Enable the Hosts view in the Infrastructure app.',
      values: {
        betaLabel: `<em>[${betaLabel}]</em>`,
      },
    }),
    schema: schema.boolean(),
  },
  [enableInfrastructureContainerAssetView]: {
    category: [observabilityFeatureId],
    name: i18n.translate('xpack.observability.enableInfrastructureContainerAssetView', {
      defaultMessage: 'Container view',
    }),
    value: true,
    description: i18n.translate(
      'xpack.observability.enableInfrastructureContainerAssetViewDescription',
      {
        defaultMessage: 'Enable the Container asset view in the Infrastructure app.',
      }
    ),
    schema: schema.boolean(),
  },
  [enableInfrastructureProfilingIntegration]: {
    category: [observabilityFeatureId],
    name: i18n.translate('xpack.observability.enableInfrastructureProfilingIntegration', {
      defaultMessage: 'Universal Profiling integration in Infrastructure',
    }),
    value: true,
    description: i18n.translate(
      'xpack.observability.enableInfrastructureProfilingIntegrationDescription',
      {
        defaultMessage: 'Enable Universal Profiling integration in the Infrastructure app.',
      }
    ),
    schema: schema.boolean(),
  },
  [enableInfrastructureAssetCustomDashboards]: {
    category: [observabilityFeatureId],
    name: i18n.translate('xpack.observability.enableInfrastructureAssetCustomDashboards', {
      defaultMessage: 'Custom dashboards for asset details in Infrastructure',
    }),
    value: false,
    description: i18n.translate(
      'xpack.observability.enableInfrastructureAssetCustomDashboardsDescription',
      {
        defaultMessage:
          '{technicalPreviewLabel} Enable option to link custom dashboards in the asset details view.',
        values: {
          technicalPreviewLabel: `<em>[${technicalPreviewLabel}]</em>`,
        },
      }
    ),
    schema: schema.boolean(),
  },
  [enableAwsLambdaMetrics]: {
    category: [observabilityFeatureId],
    name: i18n.translate('xpack.observability.enableAwsLambdaMetrics', {
      defaultMessage: 'AWS Lambda Metrics',
    }),
    description: i18n.translate('xpack.observability.enableAwsLambdaMetricsDescription', {
      defaultMessage:
        '{technicalPreviewLabel} Display Amazon Lambda metrics in the service metrics tab.',
      values: {
        technicalPreviewLabel: `<em>[${technicalPreviewLabel}]</em>`,
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
      defaultMessage: '{betaLabel} Enables Agent explorer view.',
      values: {
        betaLabel: `<em>[${betaLabel}]</em>`,
      },
    }),
    schema: schema.boolean(),
    value: true,
    requiresPageReload: true,
    type: 'boolean',
  },
  [apmEnableTableSearchBar]: {
    category: [observabilityFeatureId],
    name: i18n.translate('xpack.observability.apmEnableTableSearchBar', {
      defaultMessage: 'Instant table search',
    }),
    description: i18n.translate('xpack.observability.apmEnableTableSearchBarDescription', {
      defaultMessage:
        '{betaLabel} Enables faster searching in APM tables by adding a handy search bar with live filtering. Available for the following tables: Transactions and Errors',
      values: {
        betaLabel: `<em>[${betaLabel}]</em>`,
      },
    }),
    schema: schema.boolean(),
    value: true,
    requiresPageReload: true,
    type: 'boolean',
  },
  [entityCentricExperience]: {
    category: [observabilityFeatureId],
    name: i18n.translate('xpack.observability.entityCentricExperience', {
      defaultMessage: 'Entity-centric experience',
    }),
    description: i18n.translate('xpack.observability.entityCentricExperienceDescription', {
      defaultMessage: '{technicalPreviewLabel} Promote entity-centric experience to users.',
      values: {
        technicalPreviewLabel: `<em>[${technicalPreviewLabel}]</em>`,
      },
    }),
    schema: schema.boolean(),
    value: false,
    requiresPageReload: true,
    type: 'boolean',
  },
  [apmEnableServiceInventoryTableSearchBar]: {
    category: [observabilityFeatureId],
    name: i18n.translate('xpack.observability.apmEnableServiceInventoryTableSearchBar', {
      defaultMessage: 'Service Inventory instant table search',
    }),
    description: i18n.translate(
      'xpack.observability.apmEnableServiceInventoryTableSearchBarDescription',
      {
        defaultMessage:
          '{technicalPreviewLabel} Enables faster searching in the APM Service inventory table by adding a handy search bar with live filtering.',
        values: {
          technicalPreviewLabel: `<em>[${technicalPreviewLabel}]</em>`,
        },
      }
    ),
    schema: schema.boolean(),
    value: false,
    requiresPageReload: false,
    type: 'boolean',
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
  [apmEnableServiceMetrics]: {
    category: [observabilityFeatureId],
    name: i18n.translate('xpack.observability.apmEnableServiceMetrics', {
      defaultMessage: 'Service transaction metrics',
    }),
    value: true,
    description: i18n.translate('xpack.observability.apmEnableServiceMetricsDescription', {
      defaultMessage:
        '{betaLabel} Enables the usage of service transaction metrics, which are low cardinality metrics that can be used by certain views like the service inventory for faster loading times.',
      values: { betaLabel: `<em>[${betaLabel}]</em>` },
    }),
    schema: schema.boolean(),
    requiresPageReload: true,
  },
  [apmEnableContinuousRollups]: {
    category: [observabilityFeatureId],
    name: i18n.translate('xpack.observability.apmEnableContinuousRollups', {
      defaultMessage: 'Continuous rollups',
    }),
    value: true,
    description: i18n.translate('xpack.observability.apmEnableContinuousRollupsDescription', {
      defaultMessage:
        '{betaLabel} When continuous rollups is enabled, the UI will select metrics with the appropriate resolution. On larger time ranges, lower resolution metrics will be used, which will improve loading times.',
      values: { betaLabel: `<em>[${betaLabel}]</em>` },
    }),
    schema: schema.boolean(),
    requiresPageReload: true,
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
  [syntheticsThrottlingEnabled]: {
    category: [observabilityFeatureId],
    name: i18n.translate('xpack.observability.syntheticsThrottlingEnabledExperimentName', {
      defaultMessage: 'Enable Synthetics throttling (Experimental)',
    }),
    value: false,
    description: i18n.translate(
      'xpack.observability.syntheticsThrottlingEnabledExperimentDescription',
      {
        defaultMessage:
          'Enable the throttling setting in Synthetics monitor configurations. Note that throttling may still not be available for your monitors even if the setting is active. Intended for internal use only. {link}',
        values: {
          link: throttlingDocsLink({
            href: 'https://github.com/elastic/synthetics/blob/main/docs/throttling.md',
          }),
        },
      }
    ),
    schema: schema.boolean(),
    requiresPageReload: true,
  },
  [enableLegacyUptimeApp]: {
    category: [observabilityFeatureId],
    name: i18n.translate('xpack.observability.enableLegacyUptimeApp', {
      defaultMessage: 'Always show legacy Uptime app',
    }),
    value: false,
    description: i18n.translate('xpack.observability.enableLegacyUptimeAppDescription', {
      defaultMessage:
        "By default, the legacy Uptime app is hidden from the interface when it doesn't have any data for more than a week. Enable this option to always show it.",
    }),
    schema: schema.boolean(),
    requiresPageReload: true,
  },
  [apmEnableProfilingIntegration]: {
    category: [observabilityFeatureId],
    name: i18n.translate('xpack.observability.apmEnableProfilingIntegration', {
      defaultMessage: 'Enable Universal Profiling integration in APM',
    }),
    value: true,
    schema: schema.boolean(),
    requiresPageReload: false,
  },
  [profilingShowErrorFrames]: {
    category: [observabilityFeatureId],
    name: i18n.translate('xpack.observability.profilingShowErrorFramesSettingName', {
      defaultMessage: 'Show error frames in the Universal Profiling views',
    }),
    value: false,
    schema: schema.boolean(),
    requiresPageReload: true,
  },
  [profilingPervCPUWattX86]: {
    category: [observabilityFeatureId],
    name: i18n.translate('xpack.observability.profilingPervCPUWattX86UiSettingName', {
      defaultMessage: 'Per vCPU Watts - x86',
    }),
    value: 7,
    description: i18n.translate('xpack.observability.profilingPervCPUWattX86UiSettingDescription', {
      defaultMessage: `The average amortized per-core power consumption (based on 100% CPU utilization) for x86 architecture.`,
    }),
    schema: schema.number({ min: 0 }),
    requiresPageReload: true,
  },
  [profilingPervCPUWattArm64]: {
    category: [observabilityFeatureId],
    name: i18n.translate('xpack.observability.profilingPervCPUWattArm64UiSettingName', {
      defaultMessage: 'Per vCPU Watts - arm64',
    }),
    value: 2.8,
    description: i18n.translate(
      'xpack.observability.profilingPervCPUWattArm64UiSettingDescription',
      {
        defaultMessage: `The average amortized per-core power consumption (based on 100% CPU utilization) for arm64 architecture.`,
      }
    ),
    schema: schema.number({ min: 0 }),
    requiresPageReload: true,
  },
  [profilingDatacenterPUE]: {
    category: [observabilityFeatureId],
    name: i18n.translate('xpack.observability.profilingDatacenterPUEUiSettingName', {
      defaultMessage: 'Data Center PUE',
    }),
    value: 1.7,
    description: i18n.translate('xpack.observability.profilingDatacenterPUEUiSettingDescription', {
      defaultMessage: `Data center power usage effectiveness (PUE) measures how efficiently a data center uses energy. Defaults to 1.7, the average on-premise data center PUE according to the <a>Uptime Institute</a> survey
      
      You can also use the PUE that corresponds with your cloud provider:
      '<ul style="list-style-type: none;margin-left: 4px;">
        <li><strong>AWS:</strong> 1.135</li>
        <li><strong>GCP:</strong> 1.1</li>
        <li><strong>Azure:</strong> 1.185</li>
      </ul>'
      `,
      values: {
        a: (chunks) =>
          `<a href="https://ela.st/uptimeinstitute" target="_blank" rel="noopener noreferrer">${chunks}</a>`,
      },
    }),
    schema: schema.number({ min: 0 }),
    requiresPageReload: true,
  },
  [profilingCo2PerKWH]: {
    category: [observabilityFeatureId],
    name: i18n.translate('xpack.observability.profilingCo2PerKWHUiSettingName', {
      defaultMessage: 'Regional Carbon Intensity (ton/kWh)',
    }),
    value: 0.000379069,
    description: i18n.translate('xpack.observability.profilingCo2PerKWHUiSettingDescription', {
      defaultMessage: `Carbon intensity measures how clean your data center electricity is.
      Specifically, it measures the average amount of CO2 emitted per kilowatt-hour (kWh) of electricity consumed in a particular region.
      Use the cloud carbon footprint {datasheetLink} to update this value according to your region. Defaults to US East (N. Virginia).`,
      values: {
        datasheetLink:
          '<a href="https://ela.st/grid-datasheet" target="_blank" rel="noopener noreferrer">' +
          i18n.translate(
            'xpack.observability.profilingCo2PerKWHUiSettingDescription.datasheetLink',
            { defaultMessage: 'datasheet' }
          ) +
          '</a>',
      },
    }),
    schema: schema.number({ min: 0 }),
    requiresPageReload: true,
  },
  [profilingAWSCostDiscountRate]: {
    category: [observabilityFeatureId],
    name: i18n.translate('xpack.observability.profilingAWSCostDiscountRateUiSettingName', {
      defaultMessage: 'AWS EDP discount rate (%)',
    }),
    value: 0,
    schema: schema.number({ min: 0, max: 100 }),
    requiresPageReload: true,
    description: i18n.translate(
      'xpack.observability.profilingAWSCostDiscountRateUiSettingDescription',
      {
        defaultMessage:
          "If you're enrolled in the AWS Enterprise Discount Program (EDP), enter your discount rate to update the profiling cost calculation.",
      }
    ),
  },
  [profilingAzureCostDiscountRate]: {
    category: [observabilityFeatureId],
    name: i18n.translate('xpack.observability.profilingAzureCostDiscountRateUiSettingName', {
      defaultMessage: 'Azure discount rate (%)',
    }),
    value: 0,
    schema: schema.number({ min: 0, max: 100 }),
    requiresPageReload: true,
    description: i18n.translate(
      'xpack.observability.profilingAzureCostDiscountRateUiSettingDescription',
      {
        defaultMessage:
          'If you have an Azure Enterprise Agreement with Microsoft, enter your discount rate to update the profiling cost calculation.',
      }
    ),
  },
  [profilingCostPervCPUPerHour]: {
    category: [observabilityFeatureId],
    name: i18n.translate('xpack.observability.profilingCostPervCPUPerHourUiSettingName', {
      defaultMessage: 'Cost per vCPU per hour ($)',
    }),
    value: 0.0425,
    description: i18n.translate(
      'xpack.observability.profilingCostPervCPUPerHourUiSettingNameDescription',
      {
        defaultMessage: `Default Hourly Cost per CPU Core for machines not on AWS or Azure`,
      }
    ),
    schema: schema.number({ min: 0, max: 100 }),
    requiresPageReload: true,
  },
  [apmEnableTransactionProfiling]: {
    category: [observabilityFeatureId],
    name: i18n.translate('xpack.observability.apmEnableTransactionProfiling', {
      defaultMessage: 'Enable Universal Profiling on Transaction view',
    }),
    value: true,
    schema: schema.boolean(),
    requiresPageReload: true,
  },
  [profilingFetchTopNFunctionsFromStacktraces]: {
    category: [observabilityFeatureId],
    name: i18n.translate('xpack.observability.profilingFetchTopNFunctionsFromStacktraces', {
      defaultMessage: 'Switch to fetch the TopN Functions from the Stacktraces API.',
    }),
    description: i18n.translate(
      'xpack.observability.profilingFetchTopNFunctionsFromStacktracesDescription',
      {
        defaultMessage: `The topN functions pages use the topN/functions API, turn it on to switch to the stacktraces api`,
      }
    ),
    value: false,
    schema: schema.boolean(),
    requiresPageReload: false,
  },
};

function throttlingDocsLink({ href }: { href: string }) {
  return `<a href="${href}" target="_blank" rel="noopener noreferrer">${i18n.translate(
    'xpack.observability.uiSettings.throttlingDocsLinkText',
    { defaultMessage: 'read notice here.' }
  )}</a>`;
}

function traceExplorerDocsLink({ href }: { href: string }) {
  return `<a href="${href}" target="_blank">${i18n.translate(
    'xpack.observability.uiSettings.traceExplorerDocsLinkText',
    { defaultMessage: 'Learn more.' }
  )}</a>`;
}
