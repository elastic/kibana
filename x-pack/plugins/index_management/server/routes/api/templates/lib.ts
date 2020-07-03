/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { serializeTemplate, serializeLegacyTemplate } from '../../../../common/lib';
import { TemplateDeserialized, LegacyTemplateSerialized } from '../../../../common';
import { CallAsCurrentUser } from '../../../types';

export const doesTemplateExist = async ({
  name,
  callAsCurrentUser,
  isLegacy,
}: {
  name: string;
  callAsCurrentUser: CallAsCurrentUser;
  isLegacy?: boolean;
}) => {
  if (isLegacy) {
    return await callAsCurrentUser('indices.existsTemplate', { name });
  }
  return await callAsCurrentUser('dataManagement.existsTemplate', { name });
};

export const saveTemplate = async ({
  template,
  callAsCurrentUser,
  isLegacy,
}: {
  template: TemplateDeserialized;
  callAsCurrentUser: CallAsCurrentUser;
  isLegacy?: boolean;
}) => {
  const serializedTemplate = isLegacy
    ? serializeLegacyTemplate(template)
    : serializeTemplate(template);

  if (isLegacy) {
    const {
      order,
      index_patterns,
      version,
      settings,
      mappings,
      aliases,
    } = serializedTemplate as LegacyTemplateSerialized;

    return await callAsCurrentUser('indices.putTemplate', {
      name: template.name,
      order,
      body: {
        index_patterns,
        version,
        settings,
        mappings,
        aliases,
      },
    });
  }

  return await callAsCurrentUser('dataManagement.saveComposableIndexTemplate', {
    name: template.name,
    body: serializedTemplate,
  });
};
