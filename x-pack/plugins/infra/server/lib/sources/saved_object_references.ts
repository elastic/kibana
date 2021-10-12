/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectReference } from 'src/core/server';
import {
  InfraSavedSourceConfiguration,
  InfraSourceConfiguration,
} from '../../../common/source_configuration/source_configuration';
import { SavedObjectReferenceResolutionError } from './errors';

const logIndexPatternReferenceName = 'log_index_pattern_0';

interface SavedObjectAttributesWithReferences<SavedObjectAttributes> {
  attributes: SavedObjectAttributes;
  references: SavedObjectReference[];
}

/**
 * Rewrites a source configuration such that well-known saved object references
 * are extracted in the `references` array and replaced by the appropriate
 * name. This is the inverse operation to `resolveSavedObjectReferences`.
 */
export const extractSavedObjectReferences = (
  sourceConfiguration: InfraSourceConfiguration
): SavedObjectAttributesWithReferences<InfraSourceConfiguration> =>
  [
    extractLogIndicesSavedObjectReferences,
    extractInventorySavedViewReferences,
    extractMetricsExplorerSavedViewReferences,
  ].reduce<SavedObjectAttributesWithReferences<InfraSourceConfiguration>>(
    ({ attributes: accumulatedAttributes, references: accumulatedReferences }, extract) => {
      const { attributes, references } = extract(accumulatedAttributes);
      return {
        attributes,
        references: [...accumulatedReferences, ...references],
      };
    },
    {
      attributes: sourceConfiguration,
      references: [],
    }
  );

/**
 * Rewrites a source configuration such that well-known saved object references
 * are resolved from the `references` argument and replaced by the real saved
 * object ids. This is the inverse operation to `extractSavedObjectReferences`.
 */
export const resolveSavedObjectReferences = (
  attributes: InfraSavedSourceConfiguration,
  references: SavedObjectReference[]
): InfraSavedSourceConfiguration =>
  [
    resolveLogIndicesSavedObjectReferences,
    resolveInventoryViewSavedObjectReferences,
    resolveMetricsExplorerSavedObjectReferences,
  ].reduce<InfraSavedSourceConfiguration>(
    (accumulatedAttributes, resolve) => resolve(accumulatedAttributes, references),
    attributes
  );

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

const extractInventorySavedViewReferences = (
  sourceConfiguration: InfraSourceConfiguration
): SavedObjectAttributesWithReferences<InfraSourceConfiguration> => {
  const { inventoryDefaultView } = sourceConfiguration;
  if (inventoryDefaultView && inventoryDefaultView !== '0') {
    const inventoryDefaultViewReference: SavedObjectReference = {
      id: inventoryDefaultView,
      type: 'inventory-view',
      name: 'inventory-saved-view-0',
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

const extractMetricsExplorerSavedViewReferences = (
  sourceConfiguration: InfraSourceConfiguration
): SavedObjectAttributesWithReferences<InfraSourceConfiguration> => {
  const { metricsExplorerDefaultView } = sourceConfiguration;
  if (metricsExplorerDefaultView && metricsExplorerDefaultView !== '0') {
    const metricsExplorerDefaultViewReference: SavedObjectReference = {
      id: metricsExplorerDefaultView,
      type: 'metrics-explorer-view',
      name: 'metrics-explorer-saved-view-0',
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
      (reference) => reference.name === 'inventory-saved-view-0'
    );

    if (inventoryViewReference == null) {
      throw new SavedObjectReferenceResolutionError(
        'Failed to resolve Inventory default view "inventory-saved-view-0".'
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
      (reference) => reference.name === 'metrics-explorer-saved-view-0'
    );

    if (metricsExplorerViewReference == null) {
      throw new SavedObjectReferenceResolutionError(
        'Failed to resolve Metrics Explorer default view "metrics-explorer-saved-view-0".'
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
