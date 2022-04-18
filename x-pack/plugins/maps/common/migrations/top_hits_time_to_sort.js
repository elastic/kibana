/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import _ from 'lodash';
import { SOURCE_TYPES } from '../constants';
import { SortDirection } from '@kbn/data-plugin/common/search';

function isEsDocumentSource(layerDescriptor) {
  const sourceType = _.get(layerDescriptor, 'sourceDescriptor.type');
  return sourceType === SOURCE_TYPES.ES_SEARCH;
}

export function topHitsTimeToSort({ attributes }) {
  if (!attributes.layerListJSON) {
    return attributes;
  }

  let layerList = [];
  try {
    layerList = JSON.parse(attributes.layerListJSON);
  } catch (e) {
    throw new Error('Unable to parse attribute layerListJSON');
  }

  layerList.forEach((layerDescriptor) => {
    if (isEsDocumentSource(layerDescriptor)) {
      if (_.has(layerDescriptor, 'sourceDescriptor.topHitsTimeField')) {
        layerDescriptor.sourceDescriptor.sortField =
          layerDescriptor.sourceDescriptor.topHitsTimeField;
        layerDescriptor.sourceDescriptor.sortOrder = SortDirection.desc;
        delete layerDescriptor.sourceDescriptor.topHitsTimeField;
      }
    }
  });

  return {
    ...attributes,
    layerListJSON: JSON.stringify(layerList),
  };
}
