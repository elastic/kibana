/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  ProcessedImportResponse,
  SavedObjectsManagementRecord,
} from 'src/legacy/core_plugins/management/public';

export interface SummarizedSavedObjectResult {
  type: string;
  id: string;
  name: string;
  conflicts: ProcessedImportResponse['failedImports'];
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

export type SummarizedCopyToSpaceResult =
  | SuccessfulResponse
  | UnsuccessfulResponse
  | ProcessingResponse;

export function summarizeCopyResult(
  savedObject: SavedObjectsManagementRecord,
  copyResult: ProcessedImportResponse | undefined,
  includeRelated: boolean
): SummarizedCopyToSpaceResult {
  const successful = Boolean(copyResult && copyResult.failedImports.length === 0);

  const conflicts = copyResult
    ? copyResult.failedImports.filter(failed => failed.error.type === 'conflict')
    : [];

  const unresolvableErrors = copyResult
    ? copyResult.failedImports.filter(failed => failed.error.type !== 'conflict')
    : [];

  const hasConflicts = conflicts.length > 0;

  const hasUnresolvableErrors = Boolean(
    copyResult && copyResult.failedImports.some(failed => failed.error.type !== 'conflict')
  );

  const objectMap = new Map();
  objectMap.set(`${savedObject.type}:${savedObject.id}`, {
    type: savedObject.type,
    id: savedObject.id,
    name: savedObject.meta.title,
    conflicts: conflicts.filter(
      c => c.obj.type === savedObject.type && c.obj.id === savedObject.id
    ),
    hasUnresolvableErrors: unresolvableErrors.some(
      e => e.obj.type === savedObject.type && e.obj.id === savedObject.id
    ),
  });

  if (includeRelated) {
    savedObject.references.forEach(ref => {
      objectMap.set(`${ref.type}:${ref.id}`, {
        type: ref.type,
        id: ref.id,
        name: ref.name,
        conflicts: conflicts.filter(c => c.obj.type === ref.type && c.obj.id === ref.id),
        hasUnresolvableErrors: unresolvableErrors.some(
          e => e.obj.type === ref.type && e.obj.id === ref.id
        ),
      });
    });

    // The `savedObject.references` array only includes the direct references. It does not include any references of references.
    // Therefore, if there are conflicts detected in these transitive references, we need to include them here so that they are visible
    // in the UI as resolvable conflicts.
    const transitiveConflicts = conflicts.filter(c => !objectMap.has(`${c.obj.type}:${c.obj.id}`));
    transitiveConflicts.forEach(conflict => {
      objectMap.set(`${conflict.obj.type}:${conflict.obj.id}`, {
        type: conflict.obj.type,
        id: conflict.obj.id,
        name: conflict.obj.title || conflict.obj.id,
        conflicts: conflicts.filter(c => c.obj.type === conflict.obj.type && conflict.obj.id),
        hasUnresolvableErrors: unresolvableErrors.some(
          e => e.obj.type === conflict.obj.type && e.obj.id === conflict.obj.id
        ),
      });
    });
  }

  if (typeof copyResult === 'undefined') {
    return {
      processing: true,
      objects: Array.from(objectMap.values()),
    };
  }

  if (successful) {
    return {
      successful,
      hasConflicts: false,
      objects: Array.from(objectMap.values()),
      hasUnresolvableErrors: false,
      processing: false,
    };
  }

  return {
    successful,
    hasConflicts,
    objects: Array.from(objectMap.values()),
    hasUnresolvableErrors,
    processing: false,
  };
}
