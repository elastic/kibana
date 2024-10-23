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
  KnowledgeBaseEntryUpdateProps,
  Metadata,
} from '@kbn/elastic-assistant-common';
import { getKnowledgeBaseEntry } from './get_knowledge_base_entry';
import { CreateKnowledgeBaseEntrySchema, UpdateKnowledgeBaseEntrySchema } from './types';

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

interface TransformToUpdateSchemaProps {
  user: AuthenticatedUser;
  updatedAt: string;
  entry: KnowledgeBaseEntryUpdateProps;
  global?: boolean;
}

export const transformToUpdateSchema = ({
  user,
  updatedAt,
  entry,
  global = false,
}: TransformToUpdateSchemaProps): UpdateKnowledgeBaseEntrySchema => {
  const base = {
    id: entry.id,
    updated_at: updatedAt,
    updated_by: user.profile_uid ?? 'unknown',
    name: entry.name,
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

export const getUpdateScript = ({
  entry,
  isPatch,
}: {
  entry: UpdateKnowledgeBaseEntrySchema;
  isPatch?: boolean;
}) => {
  return {
    source: `
    if (params.assignEmpty == true || params.containsKey('name')) {
      ctx._source.name = params.name;
    }
    if (params.assignEmpty == true || params.containsKey('type')) {
      ctx._source.type = params.type;
    }
    if (params.assignEmpty == true || params.containsKey('users')) {
      ctx._source.users = params.users;
    }
    if (params.assignEmpty == true || params.containsKey('query_description')) {
      ctx._source.query_description = params.query_description;
    }
    if (params.assignEmpty == true || params.containsKey('input_schema')) {
      ctx._source.input_schema = params.input_schema;
    }
    if (params.assignEmpty == true || params.containsKey('output_fields')) {
      ctx._source.output_fields = params.output_fields;
    }
    if (params.assignEmpty == true || params.containsKey('kb_resource')) {
      ctx._source.kb_resource = params.kb_resource;
    }
    if (params.assignEmpty == true || params.containsKey('required')) {
      ctx._source.required = params.required;
    }
    if (params.assignEmpty == true || params.containsKey('source')) {
      ctx._source.source = params.source;
    }
    if (params.assignEmpty == true || params.containsKey('text')) {
      ctx._source.text = params.text;
    }
    if (params.assignEmpty == true || params.containsKey('description')) {
      ctx._source.description = params.description;
    }
    if (params.assignEmpty == true || params.containsKey('field')) {
      ctx._source.field = params.field;
    }
    if (params.assignEmpty == true || params.containsKey('index')) {
      ctx._source.index = params.index;
    }
    ctx._source.updated_at = params.updated_at;
    ctx._source.updated_by = params.updated_by;
  `,
    lang: 'painless',
    params: {
      ...entry, // when assigning undefined in painless, it will remove property and wil set it to null
      // for patch we don't want to remove unspecified value in payload
      assignEmpty: !(isPatch ?? true),
    },
  };
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
