/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IndexSettings } from './indices';
import { Aliases } from './aliases';
import { Mappings } from './mappings';

// Template serialized (from Elasticsearch)
interface TemplateBaseSerialized {
  index_patterns: string[];
  version?: number;
}

export interface TemplateV1Serialized extends TemplateBaseSerialized {
  settings?: IndexSettings;
  aliases?: Aliases;
  mappings?: Mappings;
  order?: number;
}

export interface TemplateV2Serialized extends TemplateBaseSerialized {
  template: {
    settings?: IndexSettings;
    aliases?: Aliases;
    mappings?: Mappings;
  };
  priority?: number;
  composed_of?: string[];
}

export interface ComponentTemplateSerialized {
  template: {
    settings?: IndexSettings;
    aliases?: Aliases;
    mappings?: Mappings;
  };
  version?: number;
  _meta?: { [key: string]: any };
}

/**
 * Interface for the template list in our UI table
 * we don't include the mappings, settings and aliases
 * to reduce the payload size sent back to the client.
 */
export interface TemplateListItem {
  name: string;
  indexPatterns: string[];
  version?: number;
  order?: number;
  hasSettings: boolean;
  hasAliases: boolean;
  hasMappings: boolean;
  ilmPolicy?: {
    name: string;
  };
  isManaged: boolean;
  _kbnMeta: {
    formatVersion: IndexTemplateFormatVersion;
  };
  type: 'v1' | 'v2' | 'system';
}

/**
 * TemplateDeserialized falls back to index template V2 format
 * The UI will only be dealing with this interface, conversion from and to V1 format
 * is done server side.
 */
export interface TemplateDeserialized {
  name: string;
  indexPatterns: string[];
  isManaged: boolean;
  template: {
    settings?: IndexSettings;
    aliases?: Aliases;
    mappings?: Mappings;
  };
  _kbnMeta: {
    formatVersion: IndexTemplateFormatVersion;
  };
  version?: number;
  priority?: number;
  order?: number;
  ilmPolicy?: {
    name: string;
  };
  composedOf?: string[];
}

export type IndexTemplateFormatVersion = 1 | 2;

export interface ComponentTemplateSerialized {
  template: {
    settings?: IndexSettings;
    aliases?: Aliases;
    mappings?: Mappings;
  };
  version?: number;
  _meta?: { [key: string]: any };
}

export interface ComponentTemplateDeserialized extends ComponentTemplateSerialized {
  name: string;
}
