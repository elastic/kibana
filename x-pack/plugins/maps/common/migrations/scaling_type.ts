/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import _ from 'lodash';
import { SOURCE_TYPES, SCALING_TYPES } from '../constants';
import { LayerDescriptor, ESSearchSourceDescriptor } from '../descriptor_types';
import { MapSavedObjectAttributes } from '../map_saved_object_type';

function isEsDocumentSource(layerDescriptor: LayerDescriptor) {
  const sourceType = _.get(layerDescriptor, 'sourceDescriptor.type');
  return sourceType === SOURCE_TYPES.ES_SEARCH;
}

export function migrateUseTopHitsToScalingType({
  attributes,
}: {
  attributes: MapSavedObjectAttributes;
}): MapSavedObjectAttributes {
  if (!attributes || !attributes.layerListJSON) {
    return attributes;
  }

  let layerList: LayerDescriptor[] = [];
  try {
    layerList = JSON.parse(attributes.layerListJSON);
  } catch (e) {
    throw new Error('Unable to parse attribute layerListJSON');
  }

  layerList.forEach((layerDescriptor: LayerDescriptor) => {
    if (isEsDocumentSource(layerDescriptor)) {
      const sourceDescriptor = layerDescriptor.sourceDescriptor as ESSearchSourceDescriptor;
      sourceDescriptor.scalingType = _.get(layerDescriptor, 'sourceDescriptor.useTopHits', false)
        ? SCALING_TYPES.TOP_HITS
        : SCALING_TYPES.LIMIT;
      // @ts-expect-error
      // useTopHits no longer in type definition but that does not mean its not in live data
      // hence the entire point of this method
      delete sourceDescriptor.useTopHits;
    }
  });

  return {
    ...attributes,
    layerListJSON: JSON.stringify(layerList),
  };
}
