/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

import { isPopulatedObject } from '@kbn/ml-is-populated-object';
import { AggName } from '../../../../../../../common/types/aggregations';
import {
  PIVOT_SUPPORTED_GROUP_BY_AGGS,
  PivotAggsConfigDict,
  PivotGroupByConfig,
  PivotGroupByConfigDict,
} from '../../../../../common';

/**
 * Helper function to rename aggName if fieldName might have already existed
 * Ex: Rename '@timestamp.value_count' to '@timestamp_1.value_count' if '@timestamp' is already used in groupBy
 * @param aggName
 * @param aggList
 * @param groupByList
 */
export function getRenamedAggNameAndMsgDueToConflict(
  aggName: AggName,
  aggList: PivotAggsConfigDict,
  groupByList: PivotGroupByConfigDict,
  groupByConfig?: PivotGroupByConfig
) {
  const [fieldName, rest] = aggName.split('.');

  const hasDateHistogramConflictWithGroupBy =
    groupByList[fieldName] &&
    groupByList[fieldName].agg === PIVOT_SUPPORTED_GROUP_BY_AGGS.DATE_HISTOGRAM;

  const hasDateHistogramConflictWithAggList =
    Object.values(aggList).find((a) => isPopulatedObject(a, ['field']) && a.field === fieldName) &&
    groupByConfig?.agg === PIVOT_SUPPORTED_GROUP_BY_AGGS.DATE_HISTOGRAM;

  if (hasDateHistogramConflictWithGroupBy || hasDateHistogramConflictWithAggList) {
    const regExp = new RegExp(`^${fieldName}(\\d)*$`);
    const increment: number = Object.keys(groupByList).reduce((acc, curr) => {
      const match = curr.match(regExp);
      if (!match || !match[1]) return acc;
      const n = Number(match[1]);
      return n > acc ? n : acc;
    }, 0 as number);

    const newAggName = `${fieldName}${increment + 1}${rest ? '.' + rest : ''}`;
    const toastMsg = i18n.translate(
      'xpack.transform.stepDefineForm.renamedAggNameDueToConflictErrorMessage',
      {
        defaultMessage: `Renamed '{aggName}' to '{newAggName}' because of a nesting conflict.`,
        values: { aggName, newAggName },
      }
    );
    return { newAggName, toastMsg };
  }
  return { newAggName: undefined, toastMsg: undefined };
}

export function getAggNameConflictToastMessages(
  aggName: AggName,
  aggList: PivotAggsConfigDict,
  groupByList: PivotGroupByConfigDict
): string[] {
  if (aggList[aggName] !== undefined) {
    return [
      i18n.translate('xpack.transform.stepDefineForm.aggExistsErrorMessage', {
        defaultMessage: `An aggregation configuration with the name '{aggName}' already exists.`,
        values: { aggName },
      }),
    ];
  }

  if (groupByList[aggName] !== undefined) {
    return [
      i18n.translate('xpack.transform.stepDefineForm.groupByExistsErrorMessage', {
        defaultMessage: `A group by configuration with the name '{aggName}' already exists.`,
        values: { aggName },
      }),
    ];
  }

  const conflicts: string[] = [];

  // check the new aggName against existing aggs and groupbys
  const aggNameSplit = aggName.split('.');
  let aggNameCheck: string;
  aggNameSplit.forEach((aggNamePart: string) => {
    aggNameCheck = aggNameCheck === undefined ? aggNamePart : `${aggNameCheck}.${aggNamePart}`;

    if (
      (aggList[aggNameCheck] !== undefined || groupByList[aggNameCheck] !== undefined) &&
      groupByList[aggNameCheck].agg !== PIVOT_SUPPORTED_GROUP_BY_AGGS.DATE_HISTOGRAM
    ) {
      conflicts.push(
        i18n.translate('xpack.transform.stepDefineForm.nestedConflictErrorMessage', {
          defaultMessage: `Couldn't add configuration '{aggName}' because of a nesting conflict with '{aggNameCheck}'.`,
          values: { aggName, aggNameCheck },
        })
      );
    }
  });

  if (conflicts.length > 0) {
    return conflicts;
  }

  // check all aggs against new aggName
  aggListNameLoop: for (const aggListName of Object.keys(aggList)) {
    const aggListNameSplit = aggListName.split('.');
    let aggListNameCheck: string | undefined;
    for (const aggListNamePart of aggListNameSplit) {
      aggListNameCheck =
        aggListNameCheck === undefined ? aggListNamePart : `${aggListNameCheck}.${aggListNamePart}`;
      if (aggListNameCheck === aggName) {
        conflicts.push(
          i18n.translate('xpack.transform.stepDefineForm.nestedAggListConflictErrorMessage', {
            defaultMessage: `Couldn't add configuration '{aggName}' because of a nesting conflict with '{aggListName}'.`,
            values: { aggName, aggListName },
          })
        );
        break aggListNameLoop;
      }
    }
  }

  if (conflicts.length > 0) {
    return conflicts;
  }

  // check all group-bys against new aggName
  groupByListNameLoop: for (const groupByListName of Object.keys(groupByList)) {
    const groupByListNameSplit = groupByListName.split('.');
    let groupByListNameCheck: string | undefined;
    for (const groupByListNamePart of groupByListNameSplit) {
      groupByListNameCheck =
        groupByListNameCheck === undefined
          ? groupByListNamePart
          : `${groupByListNameCheck}.${groupByListNamePart}`;
      if (groupByListNameCheck === aggName) {
        conflicts.push(
          i18n.translate('xpack.transform.stepDefineForm.nestedGroupByListConflictErrorMessage', {
            defaultMessage: `Couldn't add configuration '{aggName}' because of a nesting conflict with '{groupByListName}'.`,
            values: { aggName, groupByListName },
          })
        );
        break groupByListNameLoop;
      }
    }
  }

  return conflicts;
}
