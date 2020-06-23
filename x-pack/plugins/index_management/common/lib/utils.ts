/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { TemplateDeserialized, LegacyTemplateSerialized, TemplateSerialized } from '../types';

/**
 * Helper to know if a template has the legacy format or not
 * legacy format will be supported up until 9.x but marked as deprecated from 7.8
 * new (composable) format is supported from 7.8
 */
export const isLegacyTemplate = (
  template: TemplateDeserialized | LegacyTemplateSerialized | TemplateSerialized
): boolean => {
  return {}.hasOwnProperty.call(template, 'template') ? false : true;
};

export const getTemplateParameter = (
  template: LegacyTemplateSerialized | TemplateSerialized,
  setting: 'aliases' | 'settings' | 'mappings'
) => {
  return isLegacyTemplate(template)
    ? (template as LegacyTemplateSerialized)[setting]
    : (template as TemplateSerialized).template[setting];
};
