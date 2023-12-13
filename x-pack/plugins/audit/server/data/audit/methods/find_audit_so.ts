/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ISavedObjectsRepository,
  SavedObjectsFindResponse,
} from '@kbn/core-saved-objects-api-server';
import * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { KueryNode } from '@kbn/es-query';
import { AUDIT_SAVED_OBJECT_TYPE } from '../../../../common';
import { AuditSOAttributes } from '../types/audit';

export interface FindAuditOptions {
  perPage?: number;
  page?: number;
  sortField?: string;
  sortOrder?: estypes.SortOrder;
  search?: string;
  fields?: string[];
  filter?: string | KueryNode;
}

export interface FindAuditSoParams {
  savedObjectsRepository: ISavedObjectsRepository;
  options: FindAuditOptions;
}

export const findAuditSo = (
  params: FindAuditSoParams
): Promise<SavedObjectsFindResponse<AuditSOAttributes>> => {
  const { savedObjectsRepository } = params;

  return savedObjectsRepository.find({
    type: AUDIT_SAVED_OBJECT_TYPE,
    ...params.options,
  });
};
