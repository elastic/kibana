/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IndexSettings, Aliases, Mappings } from '../../../../common';

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
  isActive: boolean;
}
