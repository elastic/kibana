/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { LogColumnConfiguration } from '../../../utils/source_configuration';
import { useFormElement } from './form_elements';
import { FormValidationError, validateColumnListNotEmpty } from './validation_errors';

export const useLogColumnsFormElement = (initialValue: LogColumnConfiguration[]) => {
  const logColumnsFormElement = useFormElement<LogColumnConfiguration[], FormValidationError>({
    initialValue,
    validate: useMemo(() => async (logColumns) => validateColumnListNotEmpty(logColumns), []),
  });

  return logColumnsFormElement;
};
