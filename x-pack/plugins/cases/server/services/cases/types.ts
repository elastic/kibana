/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KueryNode } from '@kbn/es-query';
import type { SavedObjectsClientContract, SavedObjectsFindOptions } from '@kbn/core/server';
import type { IndexRefresh } from '../types';
import type { User } from '../../common/types/user';
import type { CaseSavedObjectAttributes, CaseSavedObject } from '../../common/types/case';

export interface GetCaseIdsByAlertIdArgs {
  alertId: string;
  filter?: KueryNode;
}

export interface PushedArgs {
  pushed_at: string;
  pushed_by: User;
}

export interface GetCaseArgs {
  id: string;
}

export interface DeleteCaseArgs extends GetCaseArgs, IndexRefresh {}

export interface GetCasesArgs {
  caseIds: string[];
  fields?: string[];
}

export interface FindCommentsArgs {
  id: string | string[];
  options?: SavedObjectsFindOptions;
}

export interface FindCaseCommentsArgs {
  id: string | string[];
  options?: SavedObjectsFindOptions;
}

export interface PostCaseArgs extends IndexRefresh {
  attributes: CaseSavedObjectAttributes;
  id: string;
}

export interface PatchCase extends IndexRefresh {
  caseId: string;
  updatedAttributes: Partial<CaseSavedObjectAttributes & PushedArgs>;
  originalCase: CaseSavedObject;
  version?: string;
}

export type PatchCaseArgs = PatchCase;

export interface PatchCasesArgs extends IndexRefresh {
  cases: Array<Omit<PatchCase, 'refresh'>>;
}

export interface CasesMapWithPageInfo {
  casesMap: Map<string, CaseResponse>;
  page: number;
  perPage: number;
  total: number;
}

export type FindCaseOptions = CasesFindRequest & SavedObjectsFindOptions;

export interface GetTagsArgs {
  unsecuredSavedObjectsClient: SavedObjectsClientContract;
  filter?: KueryNode;
}

export interface GetReportersArgs {
  unsecuredSavedObjectsClient: SavedObjectsClientContract;
  filter?: KueryNode;
}

export interface GetCaseIdsByAlertIdAggs {
  references: {
    doc_count: number;
    caseIds: {
      buckets: Array<{ key: string }>;
    };
  };
}
