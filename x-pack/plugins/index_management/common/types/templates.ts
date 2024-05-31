/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DataRetention, DataStream } from './data_streams';
import { IndexSettings } from './indices';
import { Aliases } from './aliases';
import { Mappings } from './mappings';

/**
 * Index template format from Elasticsearch
 */
export interface TemplateSerialized {
  index_patterns: string[];
  template?: {
    settings?: IndexSettings;
    aliases?: Aliases;
    mappings?: Mappings;
    lifecycle?: DataStream['lifecycle'];
  };
  deprecated?: boolean;
  composed_of?: string[];
  ignore_missing_component_templates?: string[];
  version?: number;
  priority?: number;
  _meta?: { [key: string]: any };
  data_stream?: {};
  allow_auto_create?: boolean;
}

/**
 * TemplateDeserialized is the format the UI will be working with,
 * regardless if we are loading the new format (composable) index template,
 * or the legacy one. Serialization is done server side.
 */
export interface TemplateDeserialized {
  name: string;
  indexPatterns: string[];
  template?: {
    settings?: IndexSettings;
    aliases?: Aliases;
    mappings?: Mappings;
  };
  lifecycle?: DataRetention;
  composedOf?: string[]; // Composable template only
  ignoreMissingComponentTemplates?: string[];
  version?: number;
  priority?: number; // Composable template only
  allowAutoCreate: string;
  order?: number; // Legacy template only
  ilmPolicy?: {
    name: string;
  };
  deprecated?: boolean;
  _meta?: { [key: string]: any }; // Composable template only
  // Composable template only
  dataStream?: {
    hidden?: boolean;
    [key: string]: any;
  };
  _kbnMeta: {
    type: TemplateType;
    hasDatastream: boolean;
    isLegacy?: boolean;
  };
}

export type TemplateType = 'default' | 'managed' | 'cloudManaged' | 'system';

export interface TemplateFromEs {
  name: string;
  index_template: TemplateSerialized;
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
  priority?: number;
  hasSettings: boolean;
  hasAliases: boolean;
  hasMappings: boolean;
  deprecated?: boolean;
  ilmPolicy?: {
    name: string;
  };
  composedOf?: string[];
  _kbnMeta: {
    type: TemplateType;
    hasDatastream: boolean;
    isLegacy?: boolean;
  };
}

/**
 * ------------------------------------------
 * --------- LEGACY INDEX TEMPLATES ---------
 * ------------------------------------------
 */

export interface LegacyTemplateSerialized {
  index_patterns: string[];
  version?: number;
  settings?: IndexSettings;
  aliases?: Aliases;
  deprecated?: boolean;
  mappings?: Mappings;
  order?: number;
}
