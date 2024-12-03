/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { GroupByField } from '../../../../../pages/slos/components/slo_list_group_by';

interface Props {
  kqlQuery: string;
  groups: string[];
  groupBy: GroupByField;
}

export const buildCombinedKqlQuery = ({ groups, groupBy, kqlQuery }: Props) => {
  let groupsKqlQuery = '';
  if (groups.length > 0) {
    groupsKqlQuery += `(`;

    groups.map((group, index) => {
      const shouldAddOr = index < groups.length - 1;
      groupsKqlQuery += `${groupBy}:"${group}"`;
      if (shouldAddOr) {
        groupsKqlQuery += ' or ';
      }
    });
    groupsKqlQuery += `)`;
  }

  let combinedKqlQuery = '';
  if (kqlQuery && groupsKqlQuery) {
    combinedKqlQuery = `${groupsKqlQuery} and ${kqlQuery}`;
  } else if (groupsKqlQuery) {
    combinedKqlQuery = groupsKqlQuery;
  } else if (kqlQuery) {
    combinedKqlQuery = kqlQuery;
  }

  return combinedKqlQuery;
};
