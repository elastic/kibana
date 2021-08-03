/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ComponentTemplateOptions,
  IndexTemplateOptions,
  IndexNames,
  Settings,
  Mappings,
  Aliases,
  Version,
  Meta,
} from '../../common';

export interface ComponentTemplate {
  template: {
    settings: Settings;
    mappings?: Mappings;
    aliases?: Aliases;
  };
  version?: Version;
  _meta?: Meta;
}

export const createComponentTemplate = (options: ComponentTemplateOptions): ComponentTemplate => {
  const { settings, mappings, aliases, version, meta } = options;

  return {
    template: {
      settings: settings ?? {},
      mappings: mappings ?? {},
      aliases: aliases ?? {},
    },
    version,
    _meta: meta,
  };
};

export interface IndexTemplate {
  index_patterns: string[];
  composed_of?: string[];
  template: {
    settings?: Settings;
    mappings?: Mappings;
    aliases?: Aliases;
  };
  priority?: number;
  version?: Version;
  _meta?: Meta;
}

export const createIndexTemplate = (
  indexNames: IndexNames,
  options?: IndexTemplateOptions
): IndexTemplate => {
  const { indexAliasName, indexAliasPattern, indexIlmPolicyName, componentTemplates } = indexNames;
  const { settings, mappings, aliases, version, meta, priority } = options ?? {};

  return {
    index_patterns: [indexAliasPattern],
    composed_of: [
      componentTemplates.commonMappingsTemplateName,
      componentTemplates.commonSettingsTemplateName,
      componentTemplates.applicationDefinedTemplateName,
      componentTemplates.userDefinedTemplateName,
      componentTemplates.userDefinedSpaceAwareTemplateName,
    ],
    template: {
      settings: {
        // External settings provided by an application (plugin)
        ...settings,

        // Hard defaults - application or user cannot override them.
        // These are necessary to make the event log mechanism work as expected.
        'index.lifecycle.name': indexIlmPolicyName,
        'index.lifecycle.rollover_alias': indexAliasName,
      },
      mappings: {
        ...mappings,
        _meta: {
          ...mappings?._meta,
          version,
        },
      },
      aliases,
    },
    priority,
    version,
    _meta: meta,
  };
};
