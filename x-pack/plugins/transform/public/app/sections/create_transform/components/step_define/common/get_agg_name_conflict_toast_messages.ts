/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

import { AggName, PivotAggsConfigDict, PivotGroupByConfigDict } from '../../../../../common';

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
  aggNameSplit.forEach((aggNamePart) => {
    aggNameCheck = aggNameCheck === undefined ? aggNamePart : `${aggNameCheck}.${aggNamePart}`;
    if (aggList[aggNameCheck] !== undefined || groupByList[aggNameCheck] !== undefined) {
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
