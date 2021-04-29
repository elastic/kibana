/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EcsEventType, KibanaRequest } from 'kibana/server';
import { KueryNode } from 'src/plugins/data/common';
import { Space } from '../../../spaces/server';

/**
 * The tenses for describing the action performed by a API route
 */
export interface Verbs {
  present: string;
  progressive: string;
  past: string;
}

export type GetSpaceFn = (request: KibanaRequest) => Promise<Space | undefined>;

/**
 * Read operations for the cases APIs.
 *
 * NOTE: If you add a value here you'll likely also need to make changes here:
 * x-pack/plugins/security/server/authorization/privileges/feature_privilege_builder/cases.ts
 */
export enum ReadOperations {
  GetCase = 'getCase',
  FindCases = 'findCases',
  GetComment = 'getComment',
  GetAllComments = 'getAllComments',
  FindComments = 'findComments',
  GetTags = 'getTags',
  GetReporters = 'getReporters',
  FindConfigurations = 'findConfigurations',
}

/**
 * Write operations for the cases APIs.
 *
 * NOTE: If you add a value here you'll likely also need to make changes here:
 * x-pack/plugins/security/server/authorization/privileges/feature_privilege_builder/cases.ts
 */
export enum WriteOperations {
  CreateCase = 'createCase',
  DeleteCase = 'deleteCase',
  UpdateCase = 'updateCase',
  PushCase = 'pushCase',
  CreateComment = 'createComment',
  DeleteAllComments = 'deleteAllComments',
  DeleteComment = 'deleteComment',
  UpdateComment = 'updateComment',
  CreateConfiguration = 'createConfiguration',
  UpdateConfiguration = 'updateConfiguration',
}

/**
 * Defines the structure for a case API route.
 */
export interface OperationDetails {
  type: EcsEventType;
  name: ReadOperations | WriteOperations;
  action: string;
  verbs: Verbs;
  docType: string;
  savedObjectType: string;
}

/**
 * Defines the helper methods and necessary information for authorizing the find API's request.
 */
export interface AuthorizationFilter {
  filter?: KueryNode;
  ensureSavedObjectIsAuthorized: (owner: string) => void;
  logSuccessfulAuthorization: () => void;
}
