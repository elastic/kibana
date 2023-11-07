/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectReference } from '@kbn/core/server';
import {
  InfraSavedSourceConfiguration,
  InfraSourceConfiguration,
} from '../../../common/source_configuration/source_configuration';
import {
  SavedObjectAttributesWithReferences,
  extractSavedObjectReferences as genericExtractSavedObjectReferences,
  resolveSavedObjectReferences as genericResolveSavedObjectReferences,
} from '../../saved_objects/references';
import { SavedObjectReferenceResolutionError } from './errors';

export const logIndexPatternReferenceName = 'log_index_pattern_0';
export const inventoryDefaultViewReferenceName = 'inventory-saved-view-0';
export const metricsExplorerDefaultViewReferenceName = 'metrics-explorer-saved-view-0';

const extractLogIndicesSavedObjectReferences = (
  sourceConfiguration: InfraSourceConfiguration
): SavedObjectAttributesWithReferences<InfraSourceConfiguration> => {
  if (sourceConfiguration.logIndices.type === 'index_pattern') {
    const logIndexPatternReference: SavedObjectReference = {
      id: sourceConfiguration.logIndices.indexPatternId,
      type: 'index-pattern',
      name: logIndexPatternReferenceName,
    };
    const attributes: InfraSourceConfiguration = {
      ...sourceConfiguration,
      logIndices: {
        ...sourceConfiguration.logIndices,
        indexPatternId: logIndexPatternReference.name,
      },
    };
    return {
      attributes,
      references: [logIndexPatternReference],
    };
  } else {
    return {
      attributes: sourceConfiguration,
      references: [],
    };
  }
};

export const extractInventorySavedViewReferences = (
  sourceConfiguration: InfraSourceConfiguration
): SavedObjectAttributesWithReferences<InfraSourceConfiguration> => {
  const { inventoryDefaultView } = sourceConfiguration;
  if (
    inventoryDefaultView &&
    inventoryDefaultView !== '0' &&
    inventoryDefaultView !== inventoryDefaultViewReferenceName
  ) {
    const inventoryDefaultViewReference: SavedObjectReference = {
      id: inventoryDefaultView,
      type: 'inventory-view',
      name: inventoryDefaultViewReferenceName,
    };
    const attributes: InfraSourceConfiguration = {
      ...sourceConfiguration,
      inventoryDefaultView: inventoryDefaultViewReference.name,
    };
    return {
      attributes,
      references: [inventoryDefaultViewReference],
    };
  } else {
    return {
      attributes: sourceConfiguration,
      references: [],
    };
  }
};

export const extractMetricsExplorerSavedViewReferences = (
  sourceConfiguration: InfraSourceConfiguration
): SavedObjectAttributesWithReferences<InfraSourceConfiguration> => {
  const { metricsExplorerDefaultView } = sourceConfiguration;
  if (
    metricsExplorerDefaultView &&
    metricsExplorerDefaultView !== '0' &&
    metricsExplorerDefaultView !== metricsExplorerDefaultViewReferenceName
  ) {
    const metricsExplorerDefaultViewReference: SavedObjectReference = {
      id: metricsExplorerDefaultView,
      type: 'metrics-explorer-view',
      name: metricsExplorerDefaultViewReferenceName,
    };
    const attributes: InfraSourceConfiguration = {
      ...sourceConfiguration,
      metricsExplorerDefaultView: metricsExplorerDefaultViewReference.name,
    };
    return {
      attributes,
      references: [metricsExplorerDefaultViewReference],
    };
  } else {
    return {
      attributes: sourceConfiguration,
      references: [],
    };
  }
};

const resolveLogIndicesSavedObjectReferences = (
  attributes: InfraSavedSourceConfiguration,
  references: SavedObjectReference[]
): InfraSavedSourceConfiguration => {
  if (attributes.logIndices?.type === 'index_pattern') {
    const logIndexPatternReference = references.find(
      (reference) => reference.name === logIndexPatternReferenceName
    );

    if (logIndexPatternReference == null) {
      throw new SavedObjectReferenceResolutionError(
        `Failed to resolve log index pattern reference "${logIndexPatternReferenceName}".`
      );
    }

    return {
      ...attributes,
      logIndices: {
        ...attributes.logIndices,
        indexPatternId: logIndexPatternReference.id,
      },
    };
  } else {
    return attributes;
  }
};

const resolveInventoryViewSavedObjectReferences = (
  attributes: InfraSavedSourceConfiguration,
  references: SavedObjectReference[]
): InfraSavedSourceConfiguration => {
  if (attributes.inventoryDefaultView && attributes.inventoryDefaultView !== '0') {
    const inventoryViewReference = references.find(
      (reference) => reference.name === inventoryDefaultViewReferenceName
    );

    if (inventoryViewReference == null) {
      throw new SavedObjectReferenceResolutionError(
        `Failed to resolve Inventory default view "${inventoryDefaultViewReferenceName}".`
      );
    }

    return {
      ...attributes,
      inventoryDefaultView: inventoryViewReference.id,
    };
  } else {
    return attributes;
  }
};

const resolveMetricsExplorerSavedObjectReferences = (
  attributes: InfraSavedSourceConfiguration,
  references: SavedObjectReference[]
): InfraSavedSourceConfiguration => {
  if (attributes.metricsExplorerDefaultView && attributes.metricsExplorerDefaultView !== '0') {
    const metricsExplorerViewReference = references.find(
      (reference) => reference.name === metricsExplorerDefaultViewReferenceName
    );

    if (metricsExplorerViewReference == null) {
      throw new SavedObjectReferenceResolutionError(
        `Failed to resolve Metrics Explorer default view "${metricsExplorerDefaultViewReferenceName}".`
      );
    }

    return {
      ...attributes,
      metricsExplorerDefaultView: metricsExplorerViewReference.id,
    };
  } else {
    return attributes;
  }
};

/**
 * Rewrites a source configuration such that well-known saved object references
 * are extracted in the `references` array and replaced by the appropriate
 * name. This is the inverse operation to `resolveSavedObjectReferences`.
 */
export const extractSavedObjectReferences = genericExtractSavedObjectReferences([
  extractLogIndicesSavedObjectReferences,
  extractInventorySavedViewReferences,
  extractMetricsExplorerSavedViewReferences,
]);

/**
 * Rewrites a source configuration such that well-known saved object references
 * are resolved from the `references` argument and replaced by the real saved
 * object ids. This is the inverse operation to `extractSavedObjectReferences`.
 */
export const resolveSavedObjectReferences = genericResolveSavedObjectReferences([
  resolveLogIndicesSavedObjectReferences,
  resolveInventoryViewSavedObjectReferences,
  resolveMetricsExplorerSavedObjectReferences,
]);
