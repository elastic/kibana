/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { i18n } from '@kbn/i18n';
import { UiSettingsParams } from '../../../../src/core/types';
import { ProgressiveLoadingQuality } from '../../apm/common/progressive_loading';
import { observabilityFeatureId } from '../common';
import {
  enableComparisonByDefault,
  enableInspectEsQueries,
  maxSuggestions,
  enableInfrastructureView,
  defaultApmServiceEnvironment,
  apmProgressiveLoading,
  enableServiceGroups,
  apmServiceInventoryOptimizedSorting,
} from '../common/ui_settings_keys';

const technicalPreviewLabel = i18n.translate(
  'xpack.observability.uiSettings.technicalPreviewLabel',
  {
    defaultMessage: 'technical preview',
  }
);

/**
 * uiSettings definitions for Observability.
 */
export const uiSettings: Record<string, UiSettingsParams<boolean | number | string>> = {
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
  [enableInfrastructureView]: {
    category: [observabilityFeatureId],
    name: i18n.translate('xpack.observability.enableInfrastructureView', {
      defaultMessage: 'Infrastructure feature',
    }),
    value: false,
    description: i18n.translate('xpack.observability.enableInfrastructureViewDescription', {
      defaultMessage: 'Enable the Infrastruture view feature in APM app',
    }),
    schema: schema.boolean(),
  },
  [defaultApmServiceEnvironment]: {
    category: [observabilityFeatureId],
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
    description: i18n.translate('xpack.observabiity.apmProgressiveLoadingDescription', {
      defaultMessage:
        '{technicalPreviewLabel} Whether to load data progressively for APM views. Data may be requested with a high sampling rate first, with lower accuracy but faster response times, while the unsampled data loads in the background',
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
        'xpack.observabiity.apmProgressiveLoadingQualityOff',
        {
          defaultMessage: 'Off',
        }
      ),
      [ProgressiveLoadingQuality.low]: i18n.translate(
        'xpack.observabiity.apmProgressiveLoadingQualityLow',
        {
          defaultMessage: 'Fastest, but least accurate',
        }
      ),
      [ProgressiveLoadingQuality.medium]: i18n.translate(
        'xpack.observabiity.apmProgressiveLoadingQualityMedium',
        {
          defaultMessage: 'Fast, and reasonably accurate',
        }
      ),
      [ProgressiveLoadingQuality.high]: i18n.translate(
        'xpack.observabiity.apmProgressiveLoadingQualityHigh',
        {
          defaultMessage: 'High',
        }
      ),
    },
  },
  [enableServiceGroups]: {
    category: [observabilityFeatureId],
    name: i18n.translate('xpack.observability.enableServiceGroups', {
      defaultMessage: 'Service groups feature',
    }),
    value: false,
    description: i18n.translate('xpack.observability.enableServiceGroupsDescription', {
      defaultMessage: '{technicalPreviewLabel} Enable the Service groups feature on APM UI',
      values: { technicalPreviewLabel: `<em>[${technicalPreviewLabel}]</em>` },
    }),
    schema: schema.boolean(),
    requiresPageReload: true,
  },
  [apmServiceInventoryOptimizedSorting]: {
    category: [observabilityFeatureId],
    name: i18n.translate('xpack.observability.apmServiceInventoryOptimizedSorting', {
      defaultMessage: 'Optimize APM Service Inventory page load performance',
    }),
    description: i18n.translate(
      'xpack.observability.apmServiceInventoryOptimizedSortingDescription',
      {
        defaultMessage:
          '{technicalPreviewLabel} Default APM Service Inventory page sort (for Services without Machine Learning applied) to sort by Service Name',
        values: { technicalPreviewLabel: `<em>[${technicalPreviewLabel}]</em>` },
      }
    ),
    schema: schema.boolean(),
    value: false,
    requiresPageReload: false,
    type: 'boolean',
  },
};
