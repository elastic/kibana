/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import {
  TemplateDeserialized,
  TemplateV1Serialized,
  TemplateV2Serialized,
  TemplateListItem,
} from '../types';

const hasEntries = (data: object = {}) => Object.entries(data).length > 0;

export function serializeV1Template(template: TemplateDeserialized): TemplateV1Serialized {
  const {
    name,
    version,
    order,
    indexPatterns,
    template: { settings, aliases, mappings } = {} as TemplateDeserialized['template'],
  } = template;

  const serializedTemplate: TemplateV1Serialized = {
    name,
    version,
    order,
    index_patterns: indexPatterns,
    settings,
    aliases,
    mappings,
  };

  return serializedTemplate;
}

export function serializeV2Template(template: TemplateDeserialized): TemplateV2Serialized {
  const { aliases, mappings, settings, ...templateV1serialized } = serializeV1Template(template);

  return {
    ...templateV1serialized,
    template: {
      aliases,
      mappings,
      settings,
    },
    priority: template.priority,
    composed_of: template.composedOf,
  };
}

export function deserializeV2Template(
  templateEs: TemplateV2Serialized,
  managedTemplatePrefix?: string
): TemplateDeserialized {
  const {
    name,
    version,
    order,
    index_patterns: indexPatterns,
    template,
    priority,
    composed_of: composedOf,
  } = templateEs;
  const { settings } = template;

  const deserializedTemplate: TemplateDeserialized = {
    name,
    version,
    order,
    indexPatterns: indexPatterns.sort(),
    template,
    ilmPolicy: settings && settings.index && settings.index.lifecycle,
    isManaged: Boolean(managedTemplatePrefix && name.startsWith(managedTemplatePrefix)),
    priority,
    composedOf,
    _kbnMeta: {
      formatVersion: 2,
    },
  };

  return deserializedTemplate;
}

export function deserializeV1Template(
  templateEs: TemplateV1Serialized,
  managedTemplatePrefix?: string
): TemplateDeserialized {
  const { settings, aliases, mappings, ...rest } = templateEs;

  const deserializedTemplateV2 = deserializeV2Template(
    { ...rest, template: { aliases, settings, mappings } },
    managedTemplatePrefix
  );

  return {
    ...deserializedTemplateV2,
    _kbnMeta: {
      formatVersion: 1,
    },
  };
}

export function deserializeTemplateList(
  indexTemplatesByName: { [key: string]: Omit<TemplateV1Serialized, 'name'> },
  managedTemplatePrefix?: string
): TemplateListItem[] {
  return Object.entries(indexTemplatesByName).map(([name, templateSerialized]) => {
    const {
      template: { mappings, settings, aliases },
      ...deserializedTemplate
    } = deserializeV1Template({ name, ...templateSerialized }, managedTemplatePrefix);

    return {
      ...deserializedTemplate,
      hasSettings: hasEntries(settings),
      hasAliases: hasEntries(aliases),
      hasMappings: hasEntries(mappings),
      type: name.startsWith('.')
        ? 'system'
        : deserializedTemplate._kbnMeta.formatVersion === 1
        ? 'v1'
        : 'v2',
    };
  });
}
