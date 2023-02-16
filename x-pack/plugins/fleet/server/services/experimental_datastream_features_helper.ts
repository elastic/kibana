/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  MappingProperty,
  PropertyName,
} from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

import type { ExperimentalDataStreamFeature } from '../../common/types';

export const forEachMappings = (
  mappingProperties: Record<PropertyName, MappingProperty>,
  process: (prop: MappingProperty, name: string) => void
) => {
  Object.keys(mappingProperties).forEach((mapping) => {
    const property = mappingProperties[mapping] as any;
    if (property.properties) {
      forEachMappings(property.properties, process);
    } else {
      process(property, mapping);
    }
  });
};

export const applyDocOnlyValueToMapping = (
  mappingProp: MappingProperty,
  name: string,
  featureMap: ExperimentalDataStreamFeature,
  isDocValueOnlyNumericChanged: boolean,
  isDocValueOnlyOtherChanged: boolean
) => {
  const mapping = mappingProp as any;

  const numericTypes = [
    'long',
    'integer',
    'short',
    'byte',
    'double',
    'float',
    'half_float',
    'scaled_float',
    'unsigned_long',
  ];
  if (isDocValueOnlyNumericChanged && numericTypes.includes(mapping.type ?? '')) {
    updateMapping(mapping, featureMap.features.doc_value_only_numeric);
  }

  const otherSupportedTypes = ['date', 'date_nanos', 'boolean', 'ip', 'geo_point', 'keyword'];
  if (
    isDocValueOnlyOtherChanged &&
    name !== '@timestamp' &&
    otherSupportedTypes.includes(mapping.type ?? '')
  ) {
    updateMapping(mapping, featureMap.features.doc_value_only_other);
  }
};

const updateMapping = (mapping: { index?: boolean }, featureValue: boolean) => {
  if (featureValue === false && mapping.index === false) {
    delete mapping.index;
  }
  if (featureValue && !mapping.index) {
    mapping.index = false;
  }
};
