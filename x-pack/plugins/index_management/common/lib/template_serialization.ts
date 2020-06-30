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
} from '../types';

const hasEntries = (data: object = {}) => Object.entries(data).length > 0;

export function serializeTemplate(templateDeserialized: TemplateDeserialized): TemplateSerialized {
  const { version, priority, indexPatterns, template, composedOf } = templateDeserialized;

  return {
    version,
    priority,
    template,
    index_patterns: indexPatterns,
    composed_of: composedOf,
  };
}

export function deserializeTemplate(
  templateEs: TemplateSerialized & { name: string },
  managedTemplatePrefix?: string
): TemplateDeserialized {
  const {
    name,
    version,
    index_patterns: indexPatterns,
    template = {},
    priority,
    composed_of: composedOf,
  } = templateEs;
  const { settings } = template;

  const deserializedTemplate: TemplateDeserialized = {
    name,
    version,
    priority,
    indexPatterns: indexPatterns.sort(),
    template,
    ilmPolicy: settings?.index?.lifecycle,
    composedOf,
    _kbnMeta: {
      isManaged: Boolean(managedTemplatePrefix && name.startsWith(managedTemplatePrefix)),
    },
  };

  return deserializedTemplate;
}

export function deserializeTemplateList(
  indexTemplates: Array<{ name: string; index_template: TemplateSerialized }>,
  managedTemplatePrefix?: string
): TemplateListItem[] {
  return indexTemplates.map(({ name, index_template: templateSerialized }) => {
    const {
      template: { mappings, settings, aliases },
      ...deserializedTemplate
    } = deserializeTemplate({ name, ...templateSerialized }, managedTemplatePrefix);

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
  managedTemplatePrefix?: string
): TemplateDeserialized {
  const { settings, aliases, mappings, ...rest } = templateEs;

  const deserializedTemplate = deserializeTemplate(
    { ...rest, template: { aliases, settings, mappings } },
    managedTemplatePrefix
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
  managedTemplatePrefix?: string
): TemplateListItem[] {
  return Object.entries(indexTemplatesByName).map(([name, templateSerialized]) => {
    const {
      template: { mappings, settings, aliases },
      ...deserializedTemplate
    } = deserializeLegacyTemplate({ name, ...templateSerialized }, managedTemplatePrefix);

    return {
      ...deserializedTemplate,
      hasSettings: hasEntries(settings),
      hasAliases: hasEntries(aliases),
      hasMappings: hasEntries(mappings),
    };
  });
}
