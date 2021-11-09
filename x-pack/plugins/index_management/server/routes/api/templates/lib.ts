/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IScopedClusterClient } from 'kibana/server';
import { serializeTemplate, serializeLegacyTemplate } from '../../../../common/lib';
import { TemplateDeserialized, LegacyTemplateSerialized } from '../../../../common';

export const doesTemplateExist = async ({
  name,
  client,
  isLegacy,
}: {
  name: string;
  client: IScopedClusterClient;
  isLegacy?: boolean;
}) => {
  if (isLegacy) {
    return await client.asCurrentUser.indices.existsTemplate({ name });
  }

  return await client.asCurrentUser.indices.existsIndexTemplate({ name });
};

export const saveTemplate = async ({
  template,
  client,
  isLegacy,
}: {
  template: TemplateDeserialized;
  client: IScopedClusterClient;
  isLegacy?: boolean;
}) => {
  const serializedTemplate = isLegacy
    ? serializeLegacyTemplate(template)
    : serializeTemplate(template);

  if (isLegacy) {
    const {
      order,
      // eslint-disable-next-line @typescript-eslint/naming-convention
      index_patterns,
      version,
      settings,
      mappings,
      aliases,
    } = serializedTemplate as LegacyTemplateSerialized;

    return await client.asCurrentUser.indices.putTemplate({
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

  return await client.asCurrentUser.indices.putIndexTemplate({
    name: template.name,
    // @ts-expect-error LegacyTemplateSerialized | TemplateSerialized conflicts with @elastic/elasticsearch IndicesPutIndexTemplateRequest
    body: serializedTemplate,
  });
};
