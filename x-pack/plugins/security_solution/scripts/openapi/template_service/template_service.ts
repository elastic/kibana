/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Handlebars from 'handlebars';
import type { OpenAPIV3 } from 'openapi-types';
import { resolve } from 'path';
import type { ImportsMap } from '../parsers/get_imports_map';
import type { NormalizedOperation } from '../parsers/openapi_types';
import { registerHelpers } from './register_helpers';
import { registerTemplates } from './register_templates';

export interface TemplateContext {
  importsMap: ImportsMap;
  apiOperations: NormalizedOperation[];
  components: OpenAPIV3.ComponentsObject | undefined;
}

export type TemplateName = 'schemas';

export interface ITemplateService {
  compileTemplate: (templateName: TemplateName, context: TemplateContext) => string;
}

/**
 * Initialize the template service. This service encapsulates the handlebars
 * initialization logic and provides helper methods for compiling templates.
 */
export const initTemplateService = async (): Promise<ITemplateService> => {
  // Create a handlebars instance and register helpers and partials
  const handlebars = Handlebars.create();
  registerHelpers(handlebars);
  const templates = await registerTemplates(resolve(__dirname, './templates'), handlebars);

  return {
    compileTemplate: (templateName: TemplateName, context: TemplateContext) => {
      return handlebars.compile(templates[templateName])(context);
    },
  };
};
