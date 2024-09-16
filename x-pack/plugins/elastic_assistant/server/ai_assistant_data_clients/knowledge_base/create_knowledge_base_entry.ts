/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import { AuthenticatedUser, ElasticsearchClient, Logger } from '@kbn/core/server';

import {
  DocumentEntryCreateFields,
  KnowledgeBaseEntryCreateProps,
  KnowledgeBaseEntryResponse,
  Metadata,
} from '@kbn/elastic-assistant-common';
import { getKnowledgeBaseEntry } from './get_knowledge_base_entry';
import { CreateKnowledgeBaseEntrySchema } from './types';

export interface CreateKnowledgeBaseEntryParams {
  esClient: ElasticsearchClient;
  knowledgeBaseIndex: string;
  logger: Logger;
  spaceId: string;
  user: AuthenticatedUser;
  knowledgeBaseEntry: KnowledgeBaseEntryCreateProps | LegacyKnowledgeBaseEntryCreateProps;
  global?: boolean;
  isV2?: boolean;
}

export const createKnowledgeBaseEntry = async ({
  esClient,
  knowledgeBaseIndex,
  spaceId,
  user,
  knowledgeBaseEntry,
  logger,
  global = false,
  isV2 = false,
}: CreateKnowledgeBaseEntryParams): Promise<KnowledgeBaseEntryResponse | null> => {
  const createdAt = new Date().toISOString();
  const body = isV2
    ? transformToCreateSchema({
        createdAt,
        spaceId,
        user,
        entry: knowledgeBaseEntry as unknown as KnowledgeBaseEntryCreateProps,
        global,
      })
    : transformToLegacyCreateSchema({
        createdAt,
        spaceId,
        user,
        entry: knowledgeBaseEntry as unknown as TransformToLegacyCreateSchemaProps['entry'],
        global,
      });
  try {
    const response = await esClient.create({
      body,
      id: uuidv4(),
      index: knowledgeBaseIndex,
      refresh: 'wait_for',
    });

    return await getKnowledgeBaseEntry({
      esClient,
      knowledgeBaseIndex,
      id: response._id,
      logger,
      user,
    });
  } catch (err) {
    logger.error(
      `Error creating Knowledge Base Entry: ${err} with kbResource: ${knowledgeBaseEntry.name}`
    );
    throw err;
  }
};

interface TransformToCreateSchemaProps {
  createdAt: string;
  spaceId: string;
  user: AuthenticatedUser;
  entry: KnowledgeBaseEntryCreateProps;
  global?: boolean;
}

export const transformToCreateSchema = ({
  createdAt,
  spaceId,
  user,
  entry,
  global = false,
}: TransformToCreateSchemaProps): CreateKnowledgeBaseEntrySchema => {
  const base = {
    '@timestamp': createdAt,
    created_at: createdAt,
    created_by: user.profile_uid ?? 'unknown',
    updated_at: createdAt,
    updated_by: user.profile_uid ?? 'unknown',
    name: entry.name,
    namespace: spaceId,
    type: entry.type,
    users: global
      ? []
      : [
          {
            id: user.profile_uid,
            name: user.username,
          },
        ],
  };

  if (entry.type === 'index') {
    const { inputSchema, outputFields, queryDescription, ...restEntry } = entry;
    return {
      ...base,
      ...restEntry,
      query_description: queryDescription,
      input_schema:
        entry.inputSchema?.map((schema) => ({
          field_name: schema.fieldName,
          field_type: schema.fieldType,
          description: schema.description,
        })) ?? undefined,
      output_fields: outputFields ?? undefined,
    };
  }
  return {
    ...base,
    kb_resource: entry.kbResource,
    required: entry.required ?? false,
    source: entry.source,
    text: entry.text,
    vector: undefined,
  };
};

export type LegacyKnowledgeBaseEntryCreateProps = Omit<
  DocumentEntryCreateFields,
  'kbResource' | 'source'
> & {
  metadata: Metadata;
};

interface TransformToLegacyCreateSchemaProps {
  createdAt: string;
  spaceId: string;
  user: AuthenticatedUser;
  entry: LegacyKnowledgeBaseEntryCreateProps;
  global?: boolean;
}

export const transformToLegacyCreateSchema = ({
  createdAt,
  spaceId,
  user,
  entry,
  global = false,
}: TransformToLegacyCreateSchemaProps): CreateKnowledgeBaseEntrySchema => {
  return {
    '@timestamp': createdAt,
    created_at: createdAt,
    created_by: user.profile_uid ?? 'unknown',
    updated_at: createdAt,
    updated_by: user.profile_uid ?? 'unknown',
    namespace: spaceId,
    users: global
      ? []
      : [
          {
            id: user.profile_uid,
            name: user.username,
          },
        ],
    ...entry,
    vector: undefined,
  };
};
