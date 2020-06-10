/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  SavedObjectsManagementRecord,
  ProcessedImportResponse,
  FailedImport,
} from 'src/plugins/saved_objects_management/public';
import { SavedObjectsImportConflictError } from 'kibana/public';

export interface SummarizedSavedObjectResult {
  type: string;
  id: string;
  name: string;
  icon: string;
  conflict?: FailedImportConflict;
  hasUnresolvableErrors: boolean;
}

interface SuccessfulResponse {
  successful: true;
  hasConflicts: false;
  hasUnresolvableErrors: false;
  objects: SummarizedSavedObjectResult[];
  processing: false;
}
interface UnsuccessfulResponse {
  successful: false;
  hasConflicts: boolean;
  hasUnresolvableErrors: boolean;
  objects: SummarizedSavedObjectResult[];
  processing: false;
}

interface ProcessingResponse {
  objects: SummarizedSavedObjectResult[];
  processing: true;
}

interface FailedImportConflict {
  obj: FailedImport['obj'];
  error: SavedObjectsImportConflictError;
}

const isConflict = (failure: FailedImport): failure is FailedImportConflict =>
  failure.error.type === 'conflict';
const typeComparator = (a: { type: string }, b: { type: string }) =>
  a.type > b.type ? 1 : a.type < b.type ? -1 : 0;

export type SummarizedCopyToSpaceResult =
  | SuccessfulResponse
  | UnsuccessfulResponse
  | ProcessingResponse;

export function summarizeCopyResult(
  savedObject: SavedObjectsManagementRecord,
  copyResult: ProcessedImportResponse | undefined
): SummarizedCopyToSpaceResult {
  const conflicts = copyResult?.failedImports.filter(isConflict) ?? [];
  const unresolvableErrors =
    copyResult?.failedImports.filter((failed) => !isConflict(failed)) ?? [];
  const getErrorFields = ({ type, id }: { type: string; id: string }) => {
    const conflict = conflicts.find(({ obj }) => obj.type === type && obj.id === id);
    const hasUnresolvableErrors = unresolvableErrors.some(
      ({ obj }) => obj.type === type && obj.id === id
    );
    return { conflict, hasUnresolvableErrors };
  };

  const objectMap = new Map<string, SummarizedSavedObjectResult>();
  objectMap.set(`${savedObject.type}:${savedObject.id}`, {
    type: savedObject.type,
    id: savedObject.id,
    name: savedObject.meta.title,
    icon: savedObject.meta.icon,
    ...getErrorFields(savedObject),
  });

  const addObjectsToMap = (
    objects: Array<{ id: string; type: string; meta: { title?: string; icon?: string } }>
  ) => {
    objects.forEach((obj) => {
      const { type, id, meta } = obj;
      objectMap.set(`${type}:${id}`, {
        type,
        id,
        name: meta.title || `${type} [id=${id}]`,
        icon: meta.icon || 'apps',
        ...getErrorFields(obj),
      });
    });
  };
  const failedImports = (copyResult?.failedImports ?? [])
    .map(({ obj }) => obj)
    .sort(typeComparator);
  addObjectsToMap(failedImports);
  const successfulImports = (copyResult?.successfulImports ?? []).sort(typeComparator);
  addObjectsToMap(successfulImports);

  if (typeof copyResult === 'undefined') {
    return {
      processing: true,
      objects: Array.from(objectMap.values()),
    };
  }

  const successful = Boolean(copyResult && copyResult.failedImports.length === 0);
  if (successful) {
    return {
      successful,
      hasConflicts: false,
      objects: Array.from(objectMap.values()),
      hasUnresolvableErrors: false,
      processing: false,
    };
  }

  const hasConflicts = conflicts.length > 0;
  const hasUnresolvableErrors = Boolean(
    copyResult && copyResult.failedImports.some((failed) => failed.error.type !== 'conflict')
  );
  return {
    successful,
    hasConflicts,
    objects: Array.from(objectMap.values()),
    hasUnresolvableErrors,
    processing: false,
  };
}
