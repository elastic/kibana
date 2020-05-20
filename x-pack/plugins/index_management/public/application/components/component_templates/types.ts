/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// Note: We could decide to export **ALL** of our types from "es_ui_shared" so we have
// a single source of truth for all of the Elasticsearch interfaces.
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
}
