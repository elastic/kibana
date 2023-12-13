/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ISavedObjectsRepository, SavedObject, SavedObjectsUtils } from '@kbn/core/server';
import { AUDIT_SAVED_OBJECT_TYPE, AuditLogOperation } from '../../../../common';
import { AuditSOAttributes } from '../types/audit';

export interface CreateAuditData {
  namespace: string;
  user: string;
  operation: AuditLogOperation;
  subject: string;
  subjectId: string;
  data: {
    old: unknown;
    new: unknown;
  };
}

export interface CreateAuditSOParams {
  savedObjectsRepository: ISavedObjectsRepository;
  data: CreateAuditData;
}

export const createAuditSo = (
  params: CreateAuditSOParams
): Promise<SavedObject<AuditSOAttributes>> => {
  const id = SavedObjectsUtils.generateId();
  const { savedObjectsRepository } = params;

  return savedObjectsRepository.create<AuditSOAttributes>(
    AUDIT_SAVED_OBJECT_TYPE,
    {
      '@timestamp': new Date().toISOString(),
      ...params.data,
    },
    {
      id,
    }
  );
};
