/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IndexSettings } from './indices';
import { Aliases } from './aliases';
import { Mappings } from './mappings';

interface ComponentTemplateBase {
  template: {
    settings?: IndexSettings;
    aliases?: Aliases;
    mappings?: Mappings;
  };
  version?: number;
  _meta?: { [key: string]: any };
}

export interface ComponentTemplateDeserialized extends ComponentTemplateBase {
  name: string;
  _kbnMeta: {
    usedBy: string[];
  };
}

export interface ComponentTemplateEs {
  name: string;
  component_template: ComponentTemplateBase;
}

export interface ComponentTemplateListItem {
  name: string;
  isInUse: boolean;
  hasMappings: boolean;
  hasAliases: boolean;
  hasSettings: boolean;
}
