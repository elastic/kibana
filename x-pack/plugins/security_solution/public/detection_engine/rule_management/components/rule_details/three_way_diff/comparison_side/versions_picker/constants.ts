/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ThreeWayDiff } from '../../../../../../../../common/api/detection_engine';
import {
  ThreeWayDiffConflict,
  ThreeWayDiffOutcome,
} from '../../../../../../../../common/api/detection_engine';
import * as i18n from '../translations';

export enum Version {
  Base = 'base',
  Current = 'current',
  Target = 'target',
  Final = 'final',
}

export enum SelectedVersions {
  BaseTarget = 'base_target',
  BaseCurrent = 'base_current',
  BaseFinal = 'base_final',
  CurrentTarget = 'current_target',
  CurrentFinal = 'current_final',
  TargetFinal = 'target_final',
}

export const getOptionsForDiffOutcome = (
  fieldDiff: ThreeWayDiff<unknown>,
  hasResolvedValueDifferentFromSuggested: boolean
): Array<{ value: SelectedVersions; text: string; title: string }> => {
  switch (fieldDiff.diff_outcome) {
    case ThreeWayDiffOutcome.StockValueCanUpdate: {
      const options = [
        {
          value: SelectedVersions.BaseTarget,
          text: i18n.UPDATE_FROM_ELASTIC_TITLE,
          title: i18n.UPDATE_FROM_ELASTIC_EXPLANATION,
        },
      ];

      if (hasResolvedValueDifferentFromSuggested) {
        options.push({
          value: SelectedVersions.BaseFinal,
          text: i18n.MY_CHANGES_TITLE,
          title: i18n.MY_CHANGES_FINAL_UPDATE_ONLY_EXPLANATION,
        });
      }

      return options;
    }
    case ThreeWayDiffOutcome.CustomizedValueNoUpdate:
      return [
        {
          value: SelectedVersions.BaseFinal,
          text: i18n.MY_CHANGES_TITLE,
          title: i18n.MY_CHANGES_EXPLANATION,
        },
      ];
    case ThreeWayDiffOutcome.CustomizedValueSameUpdate:
      return [
        {
          value: SelectedVersions.BaseFinal,
          text: i18n.MY_CHANGES_TITLE,
          title: i18n.MY_CHANGES_EXPLANATION,
        },
        {
          value: SelectedVersions.BaseTarget,
          text: i18n.UPDATE_FROM_ELASTIC_TITLE,
          title: i18n.UPDATE_FROM_ELASTIC_EXPLANATION,
        },
      ];
    case ThreeWayDiffOutcome.CustomizedValueCanUpdate: {
      if (fieldDiff.conflict === ThreeWayDiffConflict.SOLVABLE) {
        return [
          {
            value: SelectedVersions.BaseFinal,
            text: hasResolvedValueDifferentFromSuggested
              ? i18n.MY_CHANGES_TITLE
              : i18n.MERGED_CHANGES_TITLE,
            title: hasResolvedValueDifferentFromSuggested
              ? i18n.MY_CHANGES_FINAL_UPDATE_ONLY_EXPLANATION
              : i18n.MERGED_CHANGES_EXPLANATION,
          },
          {
            value: SelectedVersions.BaseTarget,
            text: i18n.UPDATE_FROM_ELASTIC_TITLE,
            title: i18n.UPDATE_FROM_ELASTIC_EXPLANATION,
          },
          {
            value: SelectedVersions.BaseCurrent,
            text: i18n.MY_ORIGINAL_CHANGES_TITLE,
            title: i18n.MY_ORIGINAL_CHANGES_EXPLANATION,
          },
        ];
      }

      if (fieldDiff.conflict === ThreeWayDiffConflict.NON_SOLVABLE) {
        const options = [
          {
            value: SelectedVersions.BaseFinal,
            text: i18n.MY_CHANGES_TITLE,
            title: i18n.MY_CHANGES_EXPLANATION,
          },
          {
            value: SelectedVersions.BaseTarget,
            text: i18n.UPDATE_FROM_ELASTIC_TITLE,
            title: i18n.UPDATE_FROM_ELASTIC_EXPLANATION,
          },
        ];

        if (hasResolvedValueDifferentFromSuggested) {
          options.push({
            value: SelectedVersions.BaseCurrent,
            text: i18n.MY_ORIGINAL_CHANGES_TITLE,
            title: i18n.MY_ORIGINAL_CHANGES_EXPLANATION,
          });
        }

        return options;
      }
    }
    case ThreeWayDiffOutcome.MissingBaseCanUpdate: {
      const options = [
        {
          value: SelectedVersions.CurrentTarget,
          text: i18n.UPDATE_FROM_ELASTIC_TITLE,
          title: i18n.UPDATE_FROM_ELASTIC_EXPLANATION,
        },
      ];

      if (hasResolvedValueDifferentFromSuggested) {
        options.push({
          value: SelectedVersions.CurrentFinal,
          text: i18n.MY_CHANGES_TITLE,
          title: i18n.MY_CHANGES_FINAL_UPDATE_ONLY_EXPLANATION,
        });
      }

      return options;
    }
    default:
      return [];
  }
};
