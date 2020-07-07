/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IndexSettings } from './indices';
import { Aliases } from './aliases';
import { Mappings } from './mappings';

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
  _kbnMeta: {
    usedBy: string[];
  };
}

export interface ComponentTemplateFromEs {
  name: string;
  component_template: ComponentTemplateSerialized;
}

export interface ComponentTemplateListItem {
  name: string;
  usedBy: string[];
  hasMappings: boolean;
  hasAliases: boolean;
  hasSettings: boolean;
}
