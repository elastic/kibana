/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
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
}
interface TemplateBase {
  name: string;
  indexPatterns: string[];
  version?: number;
  order?: number;
  ilmPolicy?: {
    name: string;
  };
  isManaged: boolean;
}

export interface TemplateV1 extends TemplateBase {
  settings?: object;
  aliases?: object;
  mappings?: object;
}

export interface TemplateV2 extends TemplateBase {
  template: {
    settings?: object;
    aliases?: object;
    mappings?: object;
  };
}

export interface TemplateDeserialized extends TemplateV1 {
  _kbnMeta?: {
    version: 1 | 2;
  };
}

export interface TemplateSerialized {
  name: string;
  index_patterns: string[];
  version?: number;
  order?: number;
  settings?: {
    [key: string]: any;
    index?: {
      [key: string]: any;
      lifecycle?: {
        name: string;
      };
    };
  };
  aliases?: {
    [key: string]: any;
  };
  mappings?: object;
}
