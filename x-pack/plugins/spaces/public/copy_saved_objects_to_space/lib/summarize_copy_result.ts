/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  SavedObjectsImportAmbiguousConflictError,
  SavedObjectsImportConflictError,
} from '@kbn/core/public';

import type { FailedImport, ProcessedImportResponse } from '.';
import type { CopyToSpaceSavedObjectTarget } from '../types';

export interface SummarizedSavedObjectResult {
  type: string;
  id: string;
  name: string;
  icon: string;
  conflict?: FailedImportConflict;
  hasMissingReferences: boolean;
  hasUnresolvableErrors: boolean;
  overwrite: boolean;
}

interface SuccessfulResponse {
  successful: true;
  hasConflicts: false;
  hasMissingReferences: false;
  hasUnresolvableErrors: false;
  objects: SummarizedSavedObjectResult[];
  processing: false;
}
interface UnsuccessfulResponse {
  successful: false;
  hasConflicts: boolean;
  hasMissingReferences: boolean;
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
  error: SavedObjectsImportConflictError | SavedObjectsImportAmbiguousConflictError;
}

const isAnyConflict = (failure: FailedImport): failure is FailedImportConflict =>
  failure.error.type === 'conflict' || failure.error.type === 'ambiguous_conflict';
const isMissingReferences = (failure: FailedImport) => failure.error.type === 'missing_references';
const isUnresolvableError = (failure: FailedImport) =>
  !isAnyConflict(failure) && !isMissingReferences(failure);
const typeComparator = (a: { type: string }, b: { type: string }) =>
  a.type > b.type ? 1 : a.type < b.type ? -1 : 0;

export type SummarizedCopyToSpaceResult =
  | SuccessfulResponse
  | UnsuccessfulResponse
  | ProcessingResponse;

export function summarizeCopyResult(
  savedObjectTarget: Required<CopyToSpaceSavedObjectTarget>,
  copyResult: ProcessedImportResponse | undefined
): SummarizedCopyToSpaceResult {
  const conflicts = copyResult?.failedImports.filter(isAnyConflict) ?? [];
  const missingReferences = copyResult?.failedImports.filter(isMissingReferences) ?? [];
  const unresolvableErrors =
    copyResult?.failedImports.filter((failed) => isUnresolvableError(failed)) ?? [];
  const getExtraFields = ({ type, id }: { type: string; id: string }) => {
    const conflict = conflicts.find(({ obj }) => obj.type === type && obj.id === id);
    const missingReference = missingReferences.find(
      ({ obj }) => obj.type === type && obj.id === id
    );
    const hasMissingReferences = missingReference !== undefined;
    const hasUnresolvableErrors = unresolvableErrors.some(
      ({ obj }) => obj.type === type && obj.id === id
    );
    const overwrite = conflict
      ? false
      : missingReference
      ? missingReference.obj.overwrite === true
      : copyResult?.successfulImports.some(
          (obj) => obj.type === type && obj.id === id && obj.overwrite
        ) === true;

    return { conflict, hasMissingReferences, hasUnresolvableErrors, overwrite };
  };

  const objectMap = new Map<string, SummarizedSavedObjectResult>();
  objectMap.set(`${savedObjectTarget.type}:${savedObjectTarget.id}`, {
    type: savedObjectTarget.type,
    id: savedObjectTarget.id,
    name: savedObjectTarget.title,
    icon: savedObjectTarget.icon,
    ...getExtraFields(savedObjectTarget),
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
        ...getExtraFields(obj),
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
      hasMissingReferences: false,
      hasUnresolvableErrors: false,
      processing: false,
    };
  }

  const hasConflicts = conflicts.length > 0;
  const hasMissingReferences = missingReferences.length > 0;
  const hasUnresolvableErrors = unresolvableErrors.length > 0;
  return {
    successful,
    hasConflicts,
    objects: Array.from(objectMap.values()),
    hasMissingReferences,
    hasUnresolvableErrors,
    processing: false,
  };
}
