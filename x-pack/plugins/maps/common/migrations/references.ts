/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Can not use public Layer classes to extract references since this logic must run in both client and server.

import { SavedObjectReference } from '../../../../../src/core/types';
import { MapSavedObjectAttributes } from '../map_saved_object_type';
import { LayerDescriptor, VectorLayerDescriptor } from '../descriptor_types';

interface IndexPatternReferenceDescriptor {
  indexPatternId?: string;
  indexPatternRefName?: string;
}

export function extractReferences({
  attributes,
  references = [],
}: {
  attributes: MapSavedObjectAttributes;
  references?: SavedObjectReference[];
}) {
  if (!attributes.layerListJSON) {
    return { attributes, references };
  }

  const extractedReferences: SavedObjectReference[] = [];

  let layerList: LayerDescriptor[] = [];
  try {
    layerList = JSON.parse(attributes.layerListJSON);
  } catch (e) {
    throw new Error('Unable to parse attribute layerListJSON');
  }

  layerList.forEach((layer, layerIndex) => {
    // Extract index-pattern references from source descriptor
    if (layer.sourceDescriptor && 'indexPatternId' in layer.sourceDescriptor) {
      const sourceDescriptor = layer.sourceDescriptor as IndexPatternReferenceDescriptor;
      const refName = `layer_${layerIndex}_source_index_pattern`;
      extractedReferences.push({
        name: refName,
        type: 'index-pattern',
        id: sourceDescriptor.indexPatternId!,
      });
      delete sourceDescriptor.indexPatternId;
      sourceDescriptor.indexPatternRefName = refName;
    }

    if ('joins' in layer) {
      // Extract index-pattern references from join
      const vectorLayer = layer as VectorLayerDescriptor;
      const joins = vectorLayer.joins ? vectorLayer.joins : [];
      joins.forEach((join, joinIndex) => {
        if ('indexPatternId' in join.right) {
          const sourceDescriptor = join.right as IndexPatternReferenceDescriptor;
          const refName = `layer_${layerIndex}_join_${joinIndex}_index_pattern`;
          extractedReferences.push({
            name: refName,
            type: 'index-pattern',
            id: sourceDescriptor.indexPatternId!,
          });
          delete sourceDescriptor.indexPatternId;
          sourceDescriptor.indexPatternRefName = refName;
        }
      });
    }
  });

  return {
    attributes: {
      ...attributes,
      layerListJSON: JSON.stringify(layerList),
    },
    references: references.concat(extractedReferences),
  };
}

function findReference(targetName: string, references: SavedObjectReference[]) {
  const reference = references.find(({ name }) => name === targetName);
  if (!reference) {
    throw new Error(`Could not find reference "${targetName}"`);
  }
  return reference;
}

export function injectReferences({
  attributes,
  references,
}: {
  attributes: MapSavedObjectAttributes;
  references: SavedObjectReference[];
}) {
  if (!attributes.layerListJSON) {
    return { attributes };
  }

  let layerList: LayerDescriptor[] = [];
  try {
    layerList = JSON.parse(attributes.layerListJSON);
  } catch (e) {
    throw new Error('Unable to parse attribute layerListJSON');
  }

  layerList.forEach((layer) => {
    // Inject index-pattern references into source descriptor
    if (layer.sourceDescriptor && 'indexPatternRefName' in layer.sourceDescriptor) {
      const sourceDescriptor = layer.sourceDescriptor as IndexPatternReferenceDescriptor;
      const reference = findReference(sourceDescriptor.indexPatternRefName!, references);
      sourceDescriptor.indexPatternId = reference.id;
      delete sourceDescriptor.indexPatternRefName;
    }

    if ('joins' in layer) {
      // Inject index-pattern references into join
      const vectorLayer = layer as VectorLayerDescriptor;
      const joins = vectorLayer.joins ? vectorLayer.joins : [];
      joins.forEach((join) => {
        if ('indexPatternRefName' in join.right) {
          const sourceDescriptor = join.right as IndexPatternReferenceDescriptor;
          const reference = findReference(sourceDescriptor.indexPatternRefName!, references);
          sourceDescriptor.indexPatternId = reference.id;
          delete sourceDescriptor.indexPatternRefName;
        }
      });
    }
  });

  return {
    attributes: {
      ...attributes,
      layerListJSON: JSON.stringify(layerList),
    },
  };
}
