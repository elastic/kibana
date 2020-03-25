/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { TemplateDeserialized } from '../../common';

/**
 * Helper to get the format version of an index template.
 * v1 will be supported up until 9.x but marked as deprecated from 7.8
 * v2 will be supported from 7.8
 */
export const getTemplateVersion = (template: TemplateDeserialized): 1 | 2 => {
  return {}.hasOwnProperty.call(template, 'template') ? 2 : 1;
};
