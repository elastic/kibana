/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExecutionContext } from '../types';

/*
 * Excludes the "painless_test" context
 * This util is used to determine whether or not to show
 * the "Index" and "Document" fields under the "Context" tab
 */
const advancedContextTypes: ExecutionContext[] = [
  'filter',
  'score',
  'boolean_script_field_script_field',
  'date_script_field',
  'double_script_field_script_field',
  'geo_point_script_field_script_field',
  'ip_script_field_script_field',
  'long_script_field_script_field',
  'string_script_field_script_field',
];

export const isAdvancedContext = (context?: ExecutionContext) =>
  Boolean(context && advancedContextTypes.indexOf(context) !== -1);
