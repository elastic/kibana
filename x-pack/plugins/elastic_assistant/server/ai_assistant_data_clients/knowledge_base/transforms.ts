/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { estypes } from '@elastic/elasticsearch';
import {
  DocumentEntry,
  DocumentEntryType,
  IndexEntry,
  IndexEntryType,
  KnowledgeBaseEntryResponse,
} from '@kbn/elastic-assistant-common';
import { EsKnowledgeBaseEntrySchema } from './types';

export const transformESSearchToKnowledgeBaseEntry = (
  response: estypes.SearchResponse<EsKnowledgeBaseEntrySchema>
): KnowledgeBaseEntryResponse[] => {
  return response.hits.hits
    .filter((hit) => hit._source !== undefined)
    .map((hit) => {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const kbEntrySchema = hit._source!;
      return { ...transformEsSchemaToEntry(kbEntrySchema), id: hit._id };
    });
};

export const transformESToKnowledgeBase = (
  response: EsKnowledgeBaseEntrySchema[]
): KnowledgeBaseEntryResponse[] => {
  return response.map((kbEntrySchema) => {
    return transformEsSchemaToEntry(kbEntrySchema);
  });
};

const transformEsSchemaToEntry = (
  esKbEntry: EsKnowledgeBaseEntrySchema
): DocumentEntry | IndexEntry => {
  if (esKbEntry.type === DocumentEntryType.value) {
    const documentEntry: DocumentEntry = {
      id: esKbEntry.id,
      createdAt: esKbEntry.created_at,
      createdBy: esKbEntry.created_by,
      updatedAt: esKbEntry.updated_at,
      updatedBy: esKbEntry.updated_by,
      users:
        esKbEntry.users?.map((user) => ({
          id: user.id,
          name: user.name,
        })) ?? [],
      name: esKbEntry.name,
      namespace: esKbEntry.namespace,
      type: esKbEntry.type,
      kbResource: esKbEntry.kb_resource,
      source: esKbEntry.source,
      required: esKbEntry.required,
      text: esKbEntry.text,
      ...(esKbEntry.vector
        ? {
            vector: {
              modelId: esKbEntry.vector.model_id,
              tokens: esKbEntry.vector.tokens,
            },
          }
        : {}),
    };
    return documentEntry;
  } else if (esKbEntry.type === IndexEntryType.value) {
    const indexEntry: IndexEntry = {
      id: esKbEntry.id,
      createdAt: esKbEntry.created_at,
      createdBy: esKbEntry.created_by,
      updatedAt: esKbEntry.updated_at,
      updatedBy: esKbEntry.updated_by,
      users:
        esKbEntry.users?.map((user) => ({
          id: user.id,
          name: user.name,
        })) ?? [],
      name: esKbEntry.name,
      namespace: esKbEntry.namespace,
      // Document Entry Fields
      type: esKbEntry.type,
      index: esKbEntry.index,
      field: esKbEntry.field,
      description: esKbEntry.description,
    };
    return indexEntry;
  }
  throw new Error(`Unknown Knowledge Base Entry`);
};
