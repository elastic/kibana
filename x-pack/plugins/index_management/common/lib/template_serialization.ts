/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import {
  TemplateDeserialized,
  LegacyTemplateSerialized,
  TemplateSerialized,
  TemplateListItem,
  TemplateType,
} from '../types';

const hasEntries = (data: object = {}) => Object.entries(data).length > 0;

export function serializeTemplate(templateDeserialized: TemplateDeserialized): TemplateSerialized {
  const {
    version,
    priority,
    indexPatterns,
    template,
    composedOf,
    dataStream,
    _meta,
  } = templateDeserialized;

  return {
    version,
    priority,
    template,
    index_patterns: indexPatterns,
    data_stream: dataStream,
    composed_of: composedOf,
    _meta,
  };
}

export function deserializeTemplate(
  templateEs: TemplateSerialized & { name: string },
  cloudManagedTemplatePrefix?: string
): TemplateDeserialized {
  const {
    name,
    version,
    index_patterns: indexPatterns,
    template = {},
    priority,
    _meta,
    composed_of: composedOf,
    data_stream: dataStream,
  } = templateEs;
  const { settings } = template;

  let type: TemplateType = 'default';
  if (Boolean(cloudManagedTemplatePrefix && name.startsWith(cloudManagedTemplatePrefix))) {
    type = 'cloudManaged';
  } else if (name.startsWith('.')) {
    type = 'system';
  } else if (Boolean(_meta?.managed === true)) {
    type = 'managed';
  }

  const deserializedTemplate: TemplateDeserialized = {
    name,
    version,
    priority,
    indexPatterns: indexPatterns.sort(),
    template,
    ilmPolicy: settings?.index?.lifecycle,
    composedOf,
    dataStream,
    _meta,
    _kbnMeta: {
      type,
      hasDatastream: Boolean(dataStream),
    },
  };

  return deserializedTemplate;
}

export function deserializeTemplateList(
  indexTemplates: Array<{ name: string; index_template: TemplateSerialized }>,
  cloudManagedTemplatePrefix?: string
): TemplateListItem[] {
  return indexTemplates.map(({ name, index_template: templateSerialized }) => {
    const {
      template: { mappings, settings, aliases },
      ...deserializedTemplate
    } = deserializeTemplate({ name, ...templateSerialized }, cloudManagedTemplatePrefix);

    return {
      ...deserializedTemplate,
      hasSettings: hasEntries(settings),
      hasAliases: hasEntries(aliases),
      hasMappings: hasEntries(mappings),
    };
  });
}

/**
 * ------------------------------------------
 * --------- LEGACY INDEX TEMPLATES ---------
 * ------------------------------------------
 */

export function serializeLegacyTemplate(template: TemplateDeserialized): LegacyTemplateSerialized {
  const {
    version,
    order,
    indexPatterns,
    template: { settings, aliases, mappings },
  } = template;

  return {
    version,
    order,
    index_patterns: indexPatterns,
    settings,
    aliases,
    mappings,
  };
}

export function deserializeLegacyTemplate(
  templateEs: LegacyTemplateSerialized & { name: string },
  cloudManagedTemplatePrefix?: string
): TemplateDeserialized {
  const { settings, aliases, mappings, ...rest } = templateEs;

  const deserializedTemplate = deserializeTemplate(
    { ...rest, template: { aliases, settings, mappings } },
    cloudManagedTemplatePrefix
  );

  return {
    ...deserializedTemplate,
    order: templateEs.order,
    _kbnMeta: {
      ...deserializedTemplate._kbnMeta,
      isLegacy: true,
    },
  };
}

export function deserializeLegacyTemplateList(
  indexTemplatesByName: { [key: string]: LegacyTemplateSerialized },
  cloudManagedTemplatePrefix?: string
): TemplateListItem[] {
  return Object.entries(indexTemplatesByName).map(([name, templateSerialized]) => {
    const {
      template: { mappings, settings, aliases },
      ...deserializedTemplate
    } = deserializeLegacyTemplate({ name, ...templateSerialized }, cloudManagedTemplatePrefix);

    return {
      ...deserializedTemplate,
      hasSettings: hasEntries(settings),
      hasAliases: hasEntries(aliases),
      hasMappings: hasEntries(mappings),
    };
  });
}
