/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mapValues } from 'lodash';
import type {
  FieldsDiff,
  FieldsDiffAlgorithmsFor,
  ThreeVersionsOf,
} from '../../../../../../../common/api/detection_engine/prebuilt_rules';
import { MissingVersion } from '../../../../../../../common/api/detection_engine/prebuilt_rules';

export const calculateFieldsDiffFor = <TObject extends object>(
  ruleVersions: ThreeVersionsOf<TObject>,
  fieldsDiffAlgorithms: FieldsDiffAlgorithmsFor<TObject>
): FieldsDiff<TObject> => {
  const result = mapValues(fieldsDiffAlgorithms, (calculateFieldDiff, fieldName) => {
    const fieldVersions = pickField(fieldName as keyof TObject, ruleVersions);
    const fieldDiff = calculateFieldDiff(fieldVersions);
    return fieldDiff;
  });

  // TODO: try to improve strict typing and get rid of this "as" operator.
  return result as FieldsDiff<TObject>;
};

const pickField = <TObject extends object>(
  fieldName: keyof TObject,
  versions: ThreeVersionsOf<TObject>
): ThreeVersionsOf<TObject[typeof fieldName]> => {
  return {
    base_version:
      versions.base_version !== MissingVersion ? versions.base_version[fieldName] : MissingVersion,
    current_version: versions.current_version[fieldName],
    target_version: versions.target_version[fieldName],
  };
};
