/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Connector, FeatureName } from '@kbn/search-connectors';

export const hasIncrementalSyncFeature = (connector: Connector | undefined): boolean => {
  return connector?.features?.[FeatureName.INCREMENTAL_SYNC]?.enabled || false;
};

export const hasDocumentLevelSecurityFeature = (connector: Connector | undefined): boolean => {
  return connector?.features?.[FeatureName.DOCUMENT_LEVEL_SECURITY]?.enabled || false;
};
