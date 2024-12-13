/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import stringify from 'json-stable-stringify';
import { Version } from './versions_picker/constants';
import {
  ThreeWayDiffOutcome,
  type ThreeWayDiff,
  ThreeWayDiffConflict,
} from '../../../../../../../common/api/detection_engine';
import { VersionsPickerOption } from './versions_picker/versions_picker';
import { assertUnreachable } from '../../../../../../../common/utility_types';
import * as i18n from './translations';

/**
 * Picks the field value for a given version either from a three-way diff object or from a user-set resolved value.
 *
 * @param version - The version for which the field value is to be picked.
 * @param fieldThreeWayDiff - The three-way diff object containing the field values for different versions.
 * @param resolvedValue - A value field will be upgraded to.
 * @returns - The field value for the specified version
 */
export function pickFieldValueForVersion(
  version: Version,
  fieldThreeWayDiff: ThreeWayDiff<unknown>,
  resolvedValue: unknown
): unknown {
  if (version === Version.Final) {
    return resolvedValue;
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

interface OptionDetails {
  title: string;
  description: string;
}

/**
 * Returns the title and description for a given versions picker option.
 */
export function getOptionDetails(
  option: VersionsPickerOption,
  hasResolvedValueDifferentFromSuggested: boolean
): OptionDetails {
  switch (option) {
    case VersionsPickerOption.MyChanges:
      return hasResolvedValueDifferentFromSuggested
        ? {
            title: i18n.MY_CHANGES_TITLE,
            description: i18n.MY_CHANGES_FINAL_UPDATE_ONLY_EXPLANATION,
          }
        : {
            title: i18n.MY_CHANGES_TITLE,
            description: i18n.MY_CHANGES_EXPLANATION,
          };
    case VersionsPickerOption.MyOriginalChanges:
      return {
        title: i18n.MY_ORIGINAL_CHANGES_TITLE,
        description: i18n.MY_ORIGINAL_CHANGES_EXPLANATION,
      };
    case VersionsPickerOption.UpdateFromElastic:
      return {
        title: i18n.UPDATE_FROM_ELASTIC_TITLE,
        description: i18n.UPDATE_FROM_ELASTIC_EXPLANATION,
      };
    case VersionsPickerOption.Merged:
      return {
        title: i18n.MERGED_CHANGES_TITLE,
        description: i18n.MERGED_CHANGES_EXPLANATION,
      };
    default:
      return assertUnreachable(option);
  }
}

/**
 * Returns the versions to be compared based on the selected versions picker option.
 */
export function getVersionsForComparison(
  selectedOption: VersionsPickerOption,
  hasBaseVersion: boolean
): [Version, Version] {
  switch (selectedOption) {
    case VersionsPickerOption.MyChanges:
      return hasBaseVersion ? [Version.Base, Version.Final] : [Version.Current, Version.Final];
    case VersionsPickerOption.MyOriginalChanges:
      return [Version.Base, Version.Current];
    case VersionsPickerOption.UpdateFromElastic:
      return hasBaseVersion ? [Version.Base, Version.Target] : [Version.Current, Version.Target];
    case VersionsPickerOption.Merged:
      return [Version.Base, Version.Target];
    default:
      return assertUnreachable(selectedOption);
  }
}

/**
 * Returns the versions picker options available for a given field diff outcome.
 */
export const getComparisonOptionsForDiffOutcome = (
  diffOutcome: ThreeWayDiffOutcome,
  conflict: ThreeWayDiffConflict,
  hasResolvedValueDifferentFromSuggested: boolean
): VersionsPickerOption[] => {
  switch (diffOutcome) {
    case ThreeWayDiffOutcome.StockValueCanUpdate: {
      const options = [VersionsPickerOption.UpdateFromElastic];

      if (hasResolvedValueDifferentFromSuggested) {
        options.push(VersionsPickerOption.MyChanges);
      }

      return options;
    }
    case ThreeWayDiffOutcome.CustomizedValueNoUpdate:
      return [VersionsPickerOption.MyChanges];
    case ThreeWayDiffOutcome.CustomizedValueSameUpdate:
      return [VersionsPickerOption.MyChanges, VersionsPickerOption.UpdateFromElastic];
    case ThreeWayDiffOutcome.CustomizedValueCanUpdate: {
      if (conflict === ThreeWayDiffConflict.SOLVABLE) {
        return [
          hasResolvedValueDifferentFromSuggested
            ? VersionsPickerOption.MyChanges
            : VersionsPickerOption.Merged,
          VersionsPickerOption.UpdateFromElastic,
          VersionsPickerOption.MyOriginalChanges,
        ];
      }

      if (conflict === ThreeWayDiffConflict.NON_SOLVABLE) {
        const options = [VersionsPickerOption.MyChanges, VersionsPickerOption.UpdateFromElastic];

        if (hasResolvedValueDifferentFromSuggested) {
          options.push(VersionsPickerOption.MyOriginalChanges);
        }

        return options;
      }
    }
    case ThreeWayDiffOutcome.MissingBaseCanUpdate: {
      const options = [VersionsPickerOption.UpdateFromElastic];

      if (hasResolvedValueDifferentFromSuggested) {
        options.push(VersionsPickerOption.MyChanges);
      }

      return options;
    }
    default:
      return [];
  }
};
