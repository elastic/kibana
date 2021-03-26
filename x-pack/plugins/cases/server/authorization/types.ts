/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaRequest } from 'kibana/server';
import { EventType } from '../../../security/server';
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

// TODO: we need to have an operation per entity route so I think we need to create a bunch like
//  getCase, getComment, getSubCase etc for each, need to think of a clever way of creating them for all the routes easily?
export enum ReadOperations {
  GetCase = 'getCase',
  FindCases = 'findCases',
}

// TODO: comments
export enum WriteOperations {
  CreateCase = 'createCase',
  DeleteCase = 'deleteCase',
  UpdateCase = 'updateCase',
}

/**
 * Defines the structure for a case API route.
 */
export interface OperationDetails {
  type: EventType;
  name: ReadOperations | WriteOperations;
  action: string;
  verbs: Verbs;
  docType: string;
  savedObjectType: string;
}
