/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { TemplateDeserialized, TemplateV1Serialized, TemplateV2Serialized } from '../types';

/**
 * Helper to get the format version of an index template.
 * v1 will be supported up until 9.x but marked as deprecated from 7.8
 * v2 will be supported from 7.8
 */
export const getTemplateVersion = (
  template: TemplateDeserialized | TemplateV1Serialized | TemplateV2Serialized
): 1 | 2 => {
  return {}.hasOwnProperty.call(template, 'template') ? 2 : 1;
};

export const getTemplateParameter = (
  template: TemplateV1Serialized | TemplateV2Serialized,
  setting: 'aliases' | 'settings' | 'mappings'
) => {
  const formatVersion = getTemplateVersion(template);

  return formatVersion === 1
    ? (template as TemplateV1Serialized)[setting]
    : (template as TemplateV2Serialized).template[setting];
};
