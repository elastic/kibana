/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useRef, useState } from 'react';
import type { Query } from '@kbn/es-query';
import type { FormHook } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';

export const useIsValidEsqlQuery = (
  query: Query['query'],
  validateFields: FormHook['validateFields']
) => {
  const [isValid, setIsValid] = useState<{ isValid: boolean }>({ isValid: false });
  const isValidationComplete = useRef<boolean>(false);

  const previousQueryRef = useRef<Query['query'] | undefined>(query);
  if (previousQueryRef.current !== query) {
    previousQueryRef.current = query;
    isValidationComplete.current = false;
  }

  useEffect(() => {
    isValidationComplete.current = false;

    validateFields(['queryBar']).then((validationResult) => {
      isValidationComplete.current = true;
      setIsValid({ isValid: validationResult.areFieldsValid ?? false });
    });
  }, [query, validateFields]);

  return isValidationComplete.current ? isValid.isValid : false;
};
