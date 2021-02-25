/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

interface Mapping {
  type?: string;
  properties?: MappingProperties;
}

export interface MappingProperties {
  [key: string]: Mapping;
}

interface MetaProperties {
  [key: string]: string;
}

export interface FlatSettings {
  settings: {
    [key: string]: string;
  };
  mappings: {
    properties?: MappingProperties;
    _meta?: MetaProperties;
  };
}

// Specific to 7.x-8 upgrade
export interface FlatSettingsWithTypeName {
  settings: {
    [key: string]: string;
  };
  mappings: {
    [typeName: string]: {
      properties?: MappingProperties;
      _meta?: MetaProperties;
    };
  };
}
