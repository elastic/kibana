/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Connector, FeatureName } from '@kbn/search-connectors';

import { EXAMPLE_CONNECTOR_SERVICE_TYPES } from '../../../../common/constants';

import { isAdvancedSyncRuleSnippetEmpty } from './sync_rules_helpers';

export const hasIncrementalSyncFeature = (connector: Connector | undefined): boolean => {
  return connector?.features?.[FeatureName.INCREMENTAL_SYNC]?.enabled || false;
};

export const hasDocumentLevelSecurityFeature = (connector: Connector | undefined): boolean => {
  return connector?.features?.[FeatureName.DOCUMENT_LEVEL_SECURITY]?.enabled || false;
};

// TODO remove this when example status is removed
export const isExampleConnector = (connector: Connector | undefined): boolean =>
  Boolean(
    connector &&
      connector.service_type &&
      EXAMPLE_CONNECTOR_SERVICE_TYPES.includes(connector.service_type)
  );

export const hasAdvancedFilteringFeature = (connector: Connector | undefined): boolean =>
  Boolean(
    connector?.features
      ? connector.features[FeatureName.SYNC_RULES]?.advanced?.enabled ??
          connector.features[FeatureName.FILTERING_ADVANCED_CONFIG]
      : false
  );

export const hasBasicFilteringFeature = (connector: Connector | undefined): boolean =>
  Boolean(
    connector?.features
      ? connector.features[FeatureName.SYNC_RULES]?.basic?.enabled ??
          connector.features[FeatureName.FILTERING_RULES]
      : false
  );

export const hasNonEmptyAdvancedSnippet = (
  connector: Connector | undefined,
  advancedSnippet: string
): boolean =>
  Boolean(
    connector &&
      connector.status &&
      hasAdvancedFilteringFeature(connector) &&
      !isAdvancedSyncRuleSnippetEmpty(advancedSnippet)
  );
