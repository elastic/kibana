/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isEqual } from 'lodash/fp';
import { useEffect, useState, useRef, useCallback } from 'react';
import deepEqual from 'fast-deep-equal';

import { BrowserField, BrowserFields } from '../../../../common/search_strategy/index_fields';
import { DocValueFields } from '../../../../common/search_strategy/common';

export { BrowserField, BrowserFields, DocValueFields };

export interface UseFilteredBrowserFieldsProps {
  browserFields: BrowserFields | undefined;
  filterByIndexes?: string[];
  filterByEsTypes?: string[];
}

export const useFilteredBrowserFields = ({
  browserFields,
  filterByIndexes,
  filterByEsTypes,
}: UseFilteredBrowserFieldsProps): [BrowserFields | undefined] => {
  const [filteredFields, setFilteredFileds] = useState<BrowserFields | undefined>(undefined);
  const previousBrowserFields = useRef<BrowserFields | undefined>(undefined);
  const previousIndices = useRef<string[] | undefined>([]);

  const filterFields = useCallback(
    (fieldsToFilter: BrowserFields) => {
      const fields = Object.keys(fieldsToFilter).reduce((acc, category) => {
        const categoryFields = fieldsToFilter[category].fields;

        if (categoryFields != null) {
          return {
            ...acc,
            [category]: {
              fields: Object.keys(categoryFields).reduce((fieldAcc, field) => {
                const browserField = categoryFields[field];
                const includesAllIndices =
                  filterByIndexes == null
                    ? true
                    : filterByIndexes.every((ind) => (browserField.indexes ?? []).includes(ind));
                const isRightType =
                  filterByEsTypes == null
                    ? true
                    : filterByEsTypes.some((type) => (browserField.esTypes ?? []).includes(type));
                if (includesAllIndices && isRightType) {
                  return {
                    ...fieldAcc,
                    [field]: categoryFields[field],
                  };
                }

                return fieldAcc;
              }, {}),
            },
          };
        }

        return acc;
      }, {});

      previousIndices.current = filterByIndexes;
      previousBrowserFields.current = fieldsToFilter;
      setFilteredFileds(fields);
    },
    [filterByEsTypes, filterByIndexes]
  );

  useEffect(() => {
    if (
      browserFields != null &&
      (!deepEqual(previousBrowserFields.current, browserFields) ||
        !isEqual(previousIndices.current, filterByIndexes))
    ) {
      filterFields(browserFields);
    }
  }, [browserFields, filterByEsTypes, filterByIndexes, filterFields]);

  return [filteredFields];
};
