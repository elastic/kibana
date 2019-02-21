/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// Can not use public Layer classes to extract references since this logic must run in both client and server.

import _ from 'lodash';

export function extractReferences({ attributes, references = [] }) {
  if (!attributes.layerListJSON) {
    return { attributes, references };
  }

  const extractedReferences = [];

  const layerList = JSON.parse(attributes.layerListJSON);
  layerList.forEach((layer, layerIndex) => {

    // Extract index-pattern references from source descriptor
    if (_.has(layer, 'sourceDescriptor.indexPatternId')) {
      const refName = `layer_${layerIndex}_index_pattern`;
      extractedReferences.push({
        name: refName,
        type: 'index-pattern',
        id: layer.sourceDescriptor.indexPatternId,
      });
      delete layer.sourceDescriptor.indexPatternId;
      layer.sourceDescriptor.indexPatternRefName = refName;
    }

    // Extract index-pattern references from join
    const joins = _.get(layer, 'sourceDescriptor.joins', []);
    joins.forEach((join, joinIndex) => {
      if (_.has(join, 'right.indexPatternId')) {
        const refName = `layer_${layerIndex}_join_${joinIndex}_index_pattern`;
        extractedReferences.push({
          name: refName,
          type: 'index-pattern',
          id: join.right.indexPatternId,
        });
        delete join.right.indexPatternId;
        join.right.indexPatternRefName = refName;
      }
    });
  });

  return {
    attributes: {
      ...attributes,
      layerListJSON: JSON.stringify(layerList),
    },
    references: references.concat(extractedReferences),
  };
}

export function injectReferences({ attributes, references }) {
  if (!attributes.layerListJSON) {
    return { attributes };
  }

  const layerList = JSON.parse(attributes.layerListJSON);
  layerList.forEach((layer) => {

    // Inject index-pattern references into source descriptor
    if (_.has(layer, 'sourceDescriptor.indexPatternRefName')) {
      const reference = references.find(reference => reference.name === layer.sourceDescriptor.indexPatternRefName);
      if (!reference) {
        throw new Error(`Could not find reference "${layer.sourceDescriptor.indexPatternRefName}"`);
      }
      layer.sourceDescriptor.indexPatternId = reference.id;
      delete layer.sourceDescriptor.indexPatternRefName;
    }

    // Inject index-pattern references into join
    const joins = _.get(layer, 'sourceDescriptor.joins', []);
    joins.forEach((join) => {
      if (_.has(join, 'right.indexPatternRefName')) {
        const reference = references.find(reference => reference.name === join.right.indexPatternRefName);
        if (!reference) {
          throw new Error(`Could not find reference "${join.right.indexPatternRefName}"`);
        }
        join.right.indexPatternId = reference.id;
        delete join.right.indexPatternRefName;
      }
    });
  });

  return {
    attributes: {
      ...attributes,
      layerListJSON: JSON.stringify(layerList),
    },
  };
}
