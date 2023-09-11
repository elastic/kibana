/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type Handlebars from '@kbn/handlebars';
import { snakeCase, camelCase } from 'lodash';

export function registerHelpers(handlebarsInstance: typeof Handlebars) {
  handlebarsInstance.registerHelper('concat', (...args) => {
    const values = args.slice(0, -1) as unknown[];
    return values.join('');
  });
  handlebarsInstance.registerHelper('parseRef', (refName: string) => {
    return refName.split('/').pop();
  });
  handlebarsInstance.registerHelper('snakeCase', snakeCase);
  handlebarsInstance.registerHelper('camelCase', camelCase);
  handlebarsInstance.registerHelper('toJSON', (value: unknown) => {
    return JSON.stringify(value);
  });
  handlebarsInstance.registerHelper('includes', (array: unknown, value: unknown) => {
    if (!Array.isArray(array)) {
      return false;
    }
    return array.includes(value);
  });
  handlebarsInstance.registerHelper('or', (...args) => {
    // Last arguments is the handlebars context, so we ignore it
    return args.slice(0, -1).some((arg) => arg);
  });
  handlebarsInstance.registerHelper('eq', (a, b) => {
    return a === b;
  });
  handlebarsInstance.registerHelper('defined', (val) => {
    return val !== undefined;
  });
  /**
   * Check if the OpenAPI schema is unknown
   */
  handlebarsInstance.registerHelper('isUnknown', (val: object) => {
    return !('type' in val || '$ref' in val || 'anyOf' in val || 'oneOf' in val || 'allOf' in val);
  });
  handlebarsInstance.registerHelper('isEmpty', (val) => {
    if (Array.isArray(val)) {
      return val.length === 0;
    }
    if (typeof val === 'object') {
      return Object.keys(val).length === 0;
    }
    return val === undefined || val === null || val === '';
  });
}
