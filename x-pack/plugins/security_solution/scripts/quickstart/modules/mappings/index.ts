/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { range } from 'lodash';
import type {
  IndicesIndexSettings,
  MappingProperty,
  MappingTypeMapping,
} from '@elastic/elasticsearch/lib/api/types';
import { mappingFromFieldMap } from '@kbn/alerting-plugin/common';
import { ecsFieldMap } from '@kbn/alerts-as-data-utils';

export const getEcsMapping = () => mappingFromFieldMap(ecsFieldMap);

export interface GenerateLargeMappingPropertiesProps {
  size: number;
  fieldNameGenerator?: (idx: number) => string;
  fieldType?: MappingProperty['type'];
}

/**
 * Generates a large number of field mappings.
 * @param size Number of fields to generate
 * @param fieldNameGenerator Optional function to determine how the fields should be named - defaults to `field_1`, `field_2`, etc. Dot notation can be
 * used to nest fields, e.g. myField.subfield_1, myField.subfield_2, etc.
 * @param fieldType The type of ES field to generate
 * @returns An object ready to be inserted into the `properties` of an ES mapping object
 */
export const generateLargeMappingProperties = ({
  size,
  fieldNameGenerator = (idx: number) => `field_${idx}`,
  fieldType = 'keyword',
}: GenerateLargeMappingPropertiesProps): Record<string, MappingProperty> => {
  const properties: Record<string, MappingProperty> = {};
  range(size).forEach((i) => {
    properties[fieldNameGenerator(i)] = { type: fieldType } as MappingProperty; // Cast is needed here because TS can't seem to figure out this type correctly
  });
  return properties;
};

/**
 * Simple wrapper around `generateLargeMappingProperties` to build a complete ES mapping object instead of just the core `properties`. See
 * generateLargeMappingProperties for details.
 * @returns A complete ES mapping object
 */
export const generateLargeMapping = (
  props: GenerateLargeMappingPropertiesProps
): MappingTypeMapping => {
  return { properties: generateLargeMappingProperties(props) };
};

/**
 * If you're generating a large mapping (more than 1k fields), you'll need to also set this index setting or else you'll see the following error:
 * Root causes:
    illegal_argument_exception: Limit of total fields [1000] has been exceeded
 */
export const getSettings: ({ maxFields }: { maxFields: number }) => IndicesIndexSettings = ({
  maxFields,
}: {
  maxFields: number;
}) => ({
  'index.mapping.total_fields.limit': maxFields,
});

/**
 * Injects additional fields into a mapping. Useful for adding additional fields to the standard ECS mapping.
 * @param mapping
 * @param properties
 * @returns A new mapping combining the original mapping and new properties.
 */
export const addPropertiesToMapping = (
  mapping: MappingTypeMapping,
  properties: Record<string, MappingProperty>
): MappingTypeMapping => {
  return {
    ...mapping,
    properties: {
      ...mapping.properties,
      ...properties,
    },
  };
};
