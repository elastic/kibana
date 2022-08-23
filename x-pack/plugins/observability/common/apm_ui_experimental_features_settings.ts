/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { schema } from '@kbn/config-schema';
import { UiSettingsParams } from '@kbn/core/types';
import { i18n } from '@kbn/i18n';
import { observabilityFeatureId } from './observability_feature_id';
import {
  apmOperationsTab,
  apmServiceInventoryOptimizedSorting,
  apmTraceExplorerTab,
  enableServiceGroups,
} from './ui_settings_keys';

type Settings = Record<string, UiSettingsParams<boolean | number | string>>;

const technicalPreviewLabel = i18n.translate(
  'xpack.observability.uiSettings.technicalPreviewLabel',
  { defaultMessage: 'technical preview' }
);

export const apmExperimentalFeaturesSettings: Settings = {
  [apmTraceExplorerTab]: {
    category: [observabilityFeatureId],
    name: i18n.translate('xpack.observability.apmTraceExplorerTab', {
      defaultMessage: 'APM Trace Explorer',
    }),
    description: i18n.translate('xpack.observability.apmTraceExplorerTabDescription', {
      defaultMessage:
        '{technicalPreviewLabel} Enable the APM Trace Explorer feature, that allows you to search and inspect traces with KQL or EQL',
      values: { technicalPreviewLabel: `<em>[${technicalPreviewLabel}]</em>` },
    }),
    schema: schema.boolean(),
    value: false,
    requiresPageReload: true,
    type: 'boolean',
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
  [apmOperationsTab]: {
    category: [observabilityFeatureId],
    name: i18n.translate('xpack.observability.apmOperationsBreakdown', {
      defaultMessage: 'APM Operations Breakdown',
    }),
    description: i18n.translate('xpack.observability.apmOperationsBreakdownDescription', {
      defaultMessage:
        '{technicalPreviewLabel} Enable the APM Operations Breakdown feature, that displays aggregates for backend operations',
      values: { technicalPreviewLabel: `<em>[${technicalPreviewLabel}]</em>` },
    }),
    schema: schema.boolean(),
    value: false,
    requiresPageReload: true,
    type: 'boolean',
  },
};
