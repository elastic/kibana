/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TableSortingExpressionFunction, TableSortingArgs } from './types';

const SEPARATOR = '$$$';
const TERMS_OUT_OF_INDEX = 100000;
const OTHER_VALUE = '__other__';
const EMPTY_VALUE = '';

export const tableSortingFn: TableSortingExpressionFunction['fn'] = (
  input,
  { type, columnId, direction, terms }: TableSortingArgs
) => {
  // build a lookup map for terms
  const termsMap = (terms || []).map((termsString) => {
    return (termsString?.split(SEPARATOR) ?? []).reduce<Record<string, number>>((memo, term, i) => {
      memo[term] = i;
      return memo;
    }, {});
  });

  return {
    ...input,
    ...(type.some((t) => t !== 'none') && {
      // TODO: use the advanced sorter in table here
      rows: input.rows.sort((aRow, bRow) => {
        let score = 0;
        // for each type value compute the sorting value
        type.forEach((sortingType, index) => {
          if (!score && sortingType !== 'none') {
            const cId = columnId[index];

            const aValue = aRow[cId];
            const bValue = bRow[cId];

            const hasEmptyMapped =
              sortingType === 'terms' && termsMap[index]?.[EMPTY_VALUE] != null;
            const hasOtherMapped =
              sortingType === 'terms' && termsMap[index]?.[OTHER_VALUE] != null;
            // Enable the special handling for Other value if the user didn't specify it as value
            if (!hasOtherMapped) {
              // Empty goes AFTER the Other value
              if (aValue === OTHER_VALUE) {
                score = !hasEmptyMapped && (bValue == null || bValue === EMPTY_VALUE) ? -1 : 1;
              }
              if (bValue === OTHER_VALUE) {
                score = !hasEmptyMapped && (aValue == null || aValue === EMPTY_VALUE) ? 1 : -1;
              }
            }
            if (score === 0) {
              if (!hasEmptyMapped) {
                // Empty goes AFTER the Other value
                if (aValue === EMPTY_VALUE) {
                  score = 1;
                }
                if (bValue === EMPTY_VALUE) {
                  score = -1;
                }
              }
            }

            if (score === 0) {
              const directionFactor =
                direction[index] === 'asc'
                  ? 1
                  : direction[index] === 'desc'
                  ? -1
                  : sortingType === 'column'
                  ? 1
                  : -1;

              if (sortingType === 'terms') {
                const aIndex = termsMap[index]?.[aValue] ?? TERMS_OUT_OF_INDEX;
                const bIndex = termsMap[index]?.[bValue] ?? TERMS_OUT_OF_INDEX;
                score = aIndex - bIndex;
              }
              if (sortingType === 'alphabetical' || (sortingType === 'terms' && score === 0)) {
                if (typeof aValue === 'string' && typeof bValue === 'string') {
                  score = aValue.localeCompare(bValue);
                } else {
                  // Sort out something for Ranges, etc...
                }
              }
              if (sortingType === 'column') {
                score = aValue - bValue;
              }
              score *= directionFactor;
            }
          }
        });
        return score;
      }),
    }),
  };
};
