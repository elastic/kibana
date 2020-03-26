/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { TemplateDeserialized, TemplateV1Serialized, TemplateListItem } from '../types';
import { getTemplateVersion } from './utils';

const hasEntries = (data: object = {}) => Object.entries(data).length > 0;

export function serializeV1Template(template: TemplateDeserialized): TemplateV1Serialized {
  const {
    name,
    version,
    order,
    indexPatterns,
    template: { settings, aliases, mappings },
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

export function deserializeV1Template(
  templateEs: TemplateV1Serialized,
  managedTemplatePrefix?: string
): TemplateDeserialized {
  const {
    name,
    version,
    order,
    index_patterns: indexPatterns,
    settings,
    aliases,
    mappings,
  } = templateEs;

  const deserializedTemplate: TemplateDeserialized = {
    name,
    version,
    order,
    indexPatterns: indexPatterns.sort(),
    template: {
      settings,
      aliases,
      mappings,
    },
    ilmPolicy: settings && settings.index && settings.index.lifecycle,
    isManaged: Boolean(managedTemplatePrefix && name.startsWith(managedTemplatePrefix)),
    _kbnMeta: {
      formatVersion: getTemplateVersion(templateEs),
    },
  };

  return deserializedTemplate;
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
    };
  });
}
