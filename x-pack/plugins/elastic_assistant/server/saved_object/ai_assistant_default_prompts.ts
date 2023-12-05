/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { SavedObjectsClientContract } from '@kbn/core/server';
import { assistantPromptsTypeName } from '.';
import { AIAssistantPrompts } from '../types';

export interface SavedObjectsClientArg {
  savedObjectsClient: SavedObjectsClientContract;
  namespace: string;
}

const getDefaultAssistantPrompts = ({ namespace }: { namespace: string }): AIAssistantPrompts[] => [
  { id },
];

export const initSavedObjects = async ({
  namespace,
  savedObjectsClient,
}: SavedObjectsClientArg & { namespace: string }) => {
  const configuration = await getConfigurationSavedObject({ savedObjectsClient });
  if (configuration) {
    return configuration;
  }
  const result = await savedObjectsClient.bulkCreate(
    assistantPromptsTypeName,
    getDefaultAssistantPrompts({ namespace }),
    {}
  );

  const formattedItems = items.map((item) => {
    const savedObjectType = getSavedObjectType({ namespaceType: item.namespace_type ?? 'single' });
    const dateNow = new Date().toISOString();

    return {
      attributes: {
        comments: [],
        created_at: dateNow,
        created_by: user,
        description: item.description,
        entries: item.entries,
        name: item.name,
        os_types: item.os_types,
        tags: item.tags,
        tie_breaker_id: tieBreaker ?? uuidv4(),
        type: item.type,
        updated_by: user,
        version: undefined,
      },
      type: savedObjectType,
    } as { attributes: ExceptionListSoSchema; type: SavedObjectType };
  });

  const { saved_objects: savedObjects } =
    await savedObjectsClient.bulkCreate<ExceptionListSoSchema>(formattedItems);

  return result;
};
