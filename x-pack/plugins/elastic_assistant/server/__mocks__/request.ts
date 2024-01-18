/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { httpServerMock } from '@kbn/core/server/mocks';
import { CAPABILITIES, EVALUATE, KNOWLEDGE_BASE } from '../../common/constants';
import {
  PostEvaluateBodyInputs,
  PostEvaluatePathQueryInputs,
} from '../schemas/evaluate/post_evaluate';

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
  body: PostEvaluateBodyInputs;
  query: PostEvaluatePathQueryInputs;
}) =>
  requestMock.create({
    body,
    method: 'post',
    path: EVALUATE,
    query,
  });
