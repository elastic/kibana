/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useRef, useState } from 'react';
import type { Query } from '@kbn/es-query';
import type { FormHook } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import type { Type } from '@kbn/securitysolution-io-ts-alerting-types';
import { isEsqlRule } from '../../../../common/detection_engine/utils';

/**
 * Runs field validation on the queryBar form field for ES|QL queries
 * @param query - ES|QL query to retrieve index from
 * @param ruleType - rule type value
 * @param isQueryReadEnabled - if not enabled, return empty array. Useful if we know form or query is not valid and we don't want to retrieve index
 * @returns boolean - true if field is valid, false if field is invalid or if validation is in progress
 */
export const useIsValidEsqlQuery = (
  query: Query['query'],
  ruleType: Type,
  validateFields: FormHook['validateFields']
) => {
  /*
    Using an object to store isValid instead of a boolean to ensure 
    React component re-renders if a valid query changes to another valid query.
    If boolean was used, React would not re-render the component.
  */
  const [validity, setValidity] = useState<{ isValid: boolean }>({ isValid: false });
  const isValidating = useRef<boolean>(true);

  const previousQueryRef = useRef<Query['query'] | undefined>(query);

  const hasQueryChanged = previousQueryRef.current !== query;
  if (hasQueryChanged) {
    previousQueryRef.current = query;
    /*
      Setting isValidating to true to make the hook return false
      since the new query is not validated yet.
    */
    isValidating.current = true;
  }

  useEffect(() => {
    isValidating.current = true;

    const esqlQuery = typeof query === 'string' && isEsqlRule(ruleType) ? query : undefined;

    if (esqlQuery) {
      validateFields(['queryBar']).then((validationResult) => {
        isValidating.current = false;
        setValidity({ isValid: validationResult.areFieldsValid ?? false });
      });
    } else {
      isValidating.current = false;
    }
  }, [query, validateFields, ruleType]);

  return isValidating.current ? false : validity.isValid;
};
