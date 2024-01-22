/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { httpServerMock } from '@kbn/core/server/mocks';
import { CAPABILITIES, EVALUATE, KNOWLEDGE_BASE } from '../../common/constants';
import {
  EvaluateRequestBodyInput,
  EvaluateRequestQueryInput,
} from '../schemas/evaluate/post_evaluate_route.gen';
import {
  ELASTIC_AI_ASSISTANT_CONVERSATIONS_URL,
  ELASTIC_AI_ASSISTANT_CONVERSATIONS_URL_BULK_ACTION,
  ELASTIC_AI_ASSISTANT_CONVERSATIONS_URL_BY_ID,
  ELASTIC_AI_ASSISTANT_CONVERSATIONS_URL_FIND_USER_CONVERSATIONS,
} from '@kbn/elastic-assistant-common';
import {
  getCreateConversationSchemaMock,
  getUpdateConversationSchemaMock,
} from './conversations_schema.mock';

export const requestMock = {
  create: httpServerMock.createKibanaRequest,
};

export const getGetKnowledgeBaseStatusRequest = (resource?: string) =>
  requestMock.create({
    method: 'get',
    path: KNOWLEDGE_BASE,
    query: { resource },
  });

export const getPostKnowledgeBaseRequest = (resource?: string) =>
  requestMock.create({
    method: 'post',
    path: KNOWLEDGE_BASE,
    query: { resource },
  });

export const getDeleteKnowledgeBaseRequest = (resource?: string) =>
  requestMock.create({
    method: 'delete',
    path: KNOWLEDGE_BASE,
    query: { resource },
  });

export const getGetCapabilitiesRequest = () =>
  requestMock.create({
    method: 'get',
    path: CAPABILITIES,
  });

export const getPostEvaluateRequest = ({
  body,
  query,
}: {
  body: EvaluateRequestBodyInput;
  query: EvaluateRequestQueryInput;
}) =>
  requestMock.create({
    body,
    method: 'post',
    path: EVALUATE,
    query,
  });

export const getFindRequest = () =>
  requestMock.create({
    method: 'get',
    path: ELASTIC_AI_ASSISTANT_CONVERSATIONS_URL_FIND_USER_CONVERSATIONS,
  });

export const getDeleteConversationRequest = () =>
  requestMock.create({
    method: 'delete',
    path: ELASTIC_AI_ASSISTANT_CONVERSATIONS_URL_BY_ID,
    query: { id: 'conversation-1' },
  });

export const getCreateConversationRequest = () =>
  requestMock.create({
    method: 'post',
    path: ELASTIC_AI_ASSISTANT_CONVERSATIONS_URL,
    body: getCreateConversationSchemaMock(),
  });

export const getUpdateConversationRequest = () =>
  requestMock.create({
    method: 'put',
    path: ELASTIC_AI_ASSISTANT_CONVERSATIONS_URL,
    body: getUpdateConversationSchemaMock(),
  });

export const getConversationReadRequest = () =>
  requestMock.create({
    method: 'get',
    path: ELASTIC_AI_ASSISTANT_CONVERSATIONS_URL_BY_ID,
    query: { id: 'conversation-1' },
  });

export const getConversationReadRequestWithId = (id: string) =>
  requestMock.create({
    method: 'get',
    path: ELASTIC_AI_ASSISTANT_CONVERSATIONS_URL_BY_ID,
    query: { id },
  });

export const getConversationsBulkActionRequest = () =>
  requestMock.create({
    method: 'patch',
    path: ELASTIC_AI_ASSISTANT_CONVERSATIONS_URL_BULK_ACTION,
    body: {
      create: [],
      update: [],
      delete: {
        ids: [],
      },
    },
  });
