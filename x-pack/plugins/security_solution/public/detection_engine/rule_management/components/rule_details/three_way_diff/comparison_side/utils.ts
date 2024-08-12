/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import stringify from 'json-stable-stringify';
import { Version } from '../versions_picker/constants';
import type {
  DiffableAllFields,
  ThreeWayDiff,
} from '../../../../../../../common/api/detection_engine';

/**
 * Picks the field value for a given version either from a three-way diff object or from a user-set resolved value.
 *
 * @param version - The version for which the field value is to be picked.
 * @param fieldThreeWayDiff - The three-way diff object containing the field values for different versions.
 * @param resolvedValue - The user-set resolved value resolved value. Used if it is set and the version is final.
 * @returns - The field value for the specified version
 */
export function pickFieldValueForVersion<FieldName extends keyof DiffableAllFields>(
  version: Version,
  fieldThreeWayDiff: ThreeWayDiff<DiffableAllFields[FieldName]>,
  resolvedValue?: DiffableAllFields[FieldName]
): DiffableAllFields[FieldName] | undefined {
  if (version === Version.Final) {
    return resolvedValue ?? fieldThreeWayDiff.merged_version;
  }

  const versionFieldToPick = `${version}_version` as const;
  return fieldThreeWayDiff[versionFieldToPick];
}

/**
 * Stringifies a field value to an alphabetically sorted JSON string.
 */
export const stringifyToSortedJson = (fieldValue: unknown): string => {
  if (fieldValue === undefined) {
    return '';
  }

  if (typeof fieldValue === 'string') {
    return fieldValue;
  }

  return stringify(fieldValue, { space: 2 });
};
