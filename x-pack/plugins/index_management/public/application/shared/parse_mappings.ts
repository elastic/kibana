/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { extractMappingsDefinition } from '../components/mappings_editor/lib';
import { MappingsEditorParsedMetadata } from '../components/mappings_editor/mappings_editor';

interface MappingsDefinition {
  [key: string]: any;
}

export const parseMappings = (
  value: MappingsDefinition | undefined
): MappingsEditorParsedMetadata => {
  const mappingsDefinition = extractMappingsDefinition(value);

  if (mappingsDefinition === null) {
    return { multipleMappingsDeclared: true };
  }

  const {
    _source,
    _meta,
    _routing,
    _size,
    dynamic,
    properties,
    runtime,
    /* eslint-disable @typescript-eslint/naming-convention */
    numeric_detection,
    date_detection,
    dynamic_date_formats,
    dynamic_templates,
    /* eslint-enable @typescript-eslint/naming-convention */
    subobjects,
  } = mappingsDefinition;

  const parsed = {
    configuration: {
      _source,
      _meta,
      _routing,
      _size,
      dynamic,
      numeric_detection,
      date_detection,
      dynamic_date_formats,
      subobjects,
    },
    fields: properties,
    templates: {
      dynamic_templates,
    },
    runtime,
  };

  return { parsedDefaultValue: parsed, multipleMappingsDeclared: false };
};
