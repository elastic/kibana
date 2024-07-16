/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { estypes } from '@elastic/elasticsearch';
import { KnowledgeBaseEntryResponse } from '@kbn/elastic-assistant-common';
import { EsKnowledgeBaseEntrySchema } from './types';

export const transformESSearchToKnowledgeBaseEntry = (
  response: estypes.SearchResponse<EsKnowledgeBaseEntrySchema>
): KnowledgeBaseEntryResponse[] => {
  return response.hits.hits
    .filter((hit) => hit._source !== undefined)
    .map((hit) => {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const kbEntrySchema = hit._source!;
      const kbEntry: KnowledgeBaseEntryResponse = {
        timestamp: kbEntrySchema['@timestamp'],
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        id: hit._id!,
        createdAt: kbEntrySchema.created_at,
        createdBy: kbEntrySchema.created_by,
        updatedAt: kbEntrySchema.updated_at,
        updatedBy: kbEntrySchema.updated_by,
        users:
          kbEntrySchema.users?.map((user) => ({
            id: user.id,
            name: user.name,
          })) ?? [],
        ...(kbEntrySchema.metadata
          ? {
              metadata: {
                kbResource: kbEntrySchema.metadata.kbResource,
                source: kbEntrySchema.metadata.source,
                required: kbEntrySchema.metadata.required,
              },
            }
          : {}),
        namespace: kbEntrySchema.namespace,
        text: kbEntrySchema.text,
        ...(kbEntrySchema.vector
          ? {
              vector: {
                modelId: kbEntrySchema.vector.model_id,
                tokens: kbEntrySchema.vector.tokens,
              },
            }
          : {}),
      };

      return kbEntry;
    });
};

export const transformESToKnowledgeBase = (
  response: EsKnowledgeBaseEntrySchema[]
): KnowledgeBaseEntryResponse[] => {
  return response.map((kbEntrySchema) => {
    const kbEntry: KnowledgeBaseEntryResponse = {
      timestamp: kbEntrySchema['@timestamp'],
      id: kbEntrySchema.id,
      createdAt: kbEntrySchema.created_at,
      createdBy: kbEntrySchema.created_by,
      updatedAt: kbEntrySchema.updated_at,
      updatedBy: kbEntrySchema.updated_by,
      users:
        kbEntrySchema.users?.map((user) => ({
          id: user.id,
          name: user.name,
        })) ?? [],
      ...(kbEntrySchema.metadata
        ? {
            metadata: {
              kbResource: kbEntrySchema.metadata.kbResource,
              source: kbEntrySchema.metadata.source,
              required: kbEntrySchema.metadata.required,
            },
          }
        : {}),
      namespace: kbEntrySchema.namespace,
      text: kbEntrySchema.text,
      ...(kbEntrySchema.vector
        ? {
            vector: {
              modelId: kbEntrySchema.vector.model_id,
              tokens: kbEntrySchema.vector.tokens,
            },
          }
        : {}),
    };

    return kbEntry;
  });
};
