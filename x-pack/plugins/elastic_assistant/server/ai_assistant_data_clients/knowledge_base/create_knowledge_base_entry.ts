/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import {
  AnalyticsServiceSetup,
  AuthenticatedUser,
  ElasticsearchClient,
  Logger,
} from '@kbn/core/server';

import {
  KnowledgeBaseEntryCreateProps,
  KnowledgeBaseEntryResponse,
  KnowledgeBaseEntryUpdateProps,
} from '@kbn/elastic-assistant-common';
import {
  CREATE_KNOWLEDGE_BASE_ENTRY_ERROR_EVENT,
  CREATE_KNOWLEDGE_BASE_ENTRY_SUCCESS_EVENT,
} from '../../lib/telemetry/event_based_telemetry';
import { getKnowledgeBaseEntry } from './get_knowledge_base_entry';
import { CreateKnowledgeBaseEntrySchema, UpdateKnowledgeBaseEntrySchema } from './types';

export interface CreateKnowledgeBaseEntryParams {
  esClient: ElasticsearchClient;
  knowledgeBaseIndex: string;
  logger: Logger;
  spaceId: string;
  user: AuthenticatedUser;
  knowledgeBaseEntry: KnowledgeBaseEntryCreateProps;
  global?: boolean;
  telemetry: AnalyticsServiceSetup;
}

export const createKnowledgeBaseEntry = async ({
  esClient,
  knowledgeBaseIndex,
  spaceId,
  user,
  knowledgeBaseEntry,
  logger,
  global = false,
  telemetry,
}: CreateKnowledgeBaseEntryParams): Promise<KnowledgeBaseEntryResponse | null> => {
  const createdAt = new Date().toISOString();
  const body = transformToCreateSchema({
    createdAt,
    spaceId,
    user,
    entry: knowledgeBaseEntry as unknown as KnowledgeBaseEntryCreateProps,
    global,
  });
  const telemetryPayload = {
    entryType: body.type,
    required: body.required ?? false,
    sharing: body.users.length ? 'private' : 'global',
    ...(body.type === 'document' ? { source: body.source } : {}),
  };
  try {
    const response = await esClient.create({
      body,
      id: uuidv4(),
      index: knowledgeBaseIndex,
      refresh: 'wait_for',
    });

    const newKnowledgeBaseEntry = await getKnowledgeBaseEntry({
      esClient,
      knowledgeBaseIndex,
      id: response._id,
      logger,
      user,
    });

    telemetry.reportEvent(CREATE_KNOWLEDGE_BASE_ENTRY_SUCCESS_EVENT.eventType, telemetryPayload);
    return newKnowledgeBaseEntry;
  } catch (err) {
    logger.error(
      `Error creating Knowledge Base Entry: ${err} with kbResource: ${knowledgeBaseEntry.name}`
    );
    telemetry.reportEvent(CREATE_KNOWLEDGE_BASE_ENTRY_ERROR_EVENT.eventType, {
      ...telemetryPayload,
      errorMessage: err.message ?? 'Unknown error',
    });
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

export const getUpdateScript = ({ entry }: { entry: UpdateKnowledgeBaseEntrySchema }) => {
  // Cannot use script for updating documents with semantic_text fields
  return {
    doc: {
      ...entry,
      semantic_text: entry.text,
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
    semantic_text: entry.text,
  };
};
