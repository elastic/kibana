/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { difference, get } from 'lodash';

import { CaseAttributes, CasePatchRequest } from '../../../../common/api';

export const getCaseToUpdate = (
  currentCase: CaseAttributes,
  queryCase: CasePatchRequest
): CasePatchRequest =>
  Object.entries(queryCase).reduce(
    (acc, [key, value]) => {
      const currentValue = get(currentCase, key);
      if (
        currentValue != null &&
        Array.isArray(value) &&
        Array.isArray(currentValue) &&
        difference(value, currentValue).length !== 0
      ) {
        return {
          ...acc,
          [key]: value,
        };
      } else if (currentValue != null && value !== currentValue) {
        return {
          ...acc,
          [key]: value,
        };
      }
      return acc;
    },
    { id: queryCase.id, version: queryCase.version }
  );
