/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EcsEventType, KibanaRequest } from '@kbn/core/server';
import type { KueryNode } from '@kbn/es-query';
import { Space } from '@kbn/spaces-plugin/server';
import { CasesSupportedOperations } from '@kbn/security-plugin/server';

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
  ResolveCase = 'resolveCase',
  FindCases = 'findCases',
  GetCaseIDsByAlertID = 'getCaseIDsByAlertID',
  GetCaseStatuses = 'getCaseStatuses',
  GetComment = 'getComment',
  GetAllComments = 'getAllComments',
  FindComments = 'findComments',
  GetTags = 'getTags',
  GetReporters = 'getReporters',
  FindConfigurations = 'findConfigurations',
  GetUserActions = 'getUserActions',
  GetAlertsAttachedToCase = 'getAlertsAttachedToCase',
  GetAttachmentMetrics = 'getAttachmentMetrics',
  GetCaseMetrics = 'getCaseMetrics',
  GetUserActionMetrics = 'getUserActionMetrics',
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
  /**
   * The ECS event type that this operation should be audit logged as (creation, deletion, access, etc)
   */
  ecsType: EcsEventType;
  /**
   * The name of the operation to authorize against for the privilege check.
   * These values need to match one of the operation strings defined here: x-pack/plugins/security/server/authorization/privileges/feature_privilege_builder/cases.ts
   */
  name: CasesSupportedOperations;
  /**
   * The ECS `event.action` field, should be in the form of <entity>_<operation> e.g comment_get, case_fined
   */
  action: string;
  /**
   * The verbs that are associated with this type of operation, these should line up with the event type e.g. creating, created, create etc
   */
  verbs: Verbs;
  /**
   * The readable name of the entity being operated on e.g. case, comment, configurations (make it plural if it reads better that way etc)
   */
  docType: string;
  /**
   * The actual saved object type of the entity e.g. cases, cases-comments
   */
  savedObjectType: string;
}

/**
 * Describes an entity with the necessary fields to identify if the user is authorized to interact with the saved object
 * returned from some find query.
 */
export interface OwnerEntity {
  owner: string;
  id: string;
}

/**
 * Function callback for making sure the found saved objects are of the authorized owner
 */
export type EnsureSOAuthCallback = (entities: OwnerEntity[]) => void;

/**
 * Defines the helper methods and necessary information for authorizing the find API's request.
 */
export interface AuthFilterHelpers {
  /**
   * The owner filter to pass to the saved object client's find operation that is scoped to the authorized owners
   */
  filter?: KueryNode;
  /**
   * Utility function for checking that the returned entities are in fact authorized for the user making the request
   */
  ensureSavedObjectsAreAuthorized: EnsureSOAuthCallback;
}
