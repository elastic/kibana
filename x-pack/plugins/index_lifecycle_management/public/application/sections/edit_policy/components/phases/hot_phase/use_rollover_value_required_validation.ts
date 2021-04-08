/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { get } from 'lodash';
import { useFormData, ValidationError } from '../../../../../../shared_imports';
import { ROLLOVER_FORM_PATHS } from '../../../constants';
import { ROLLOVER_VALUE_REQUIRED_VALIDATION_CODE } from '../../../form';

export const useRolloverValueRequiredValidation = (): boolean => {
  // We track just the ROLLOVER_FORM_PATHS.maxPrimaryShardSize field because if
  // it has the ROLLOVER_VALUE_REQUIRED_VALIDATION_CODE error, all the other rollover
  // fields should too.
  const [formData] = useFormData({ watch: ROLLOVER_FORM_PATHS.maxPrimaryShardSize });
  const rolloverFieldErrors: ValidationError[] =
    get(formData, ROLLOVER_FORM_PATHS.maxPrimaryShardSize)?.errors ?? [];

  return rolloverFieldErrors.some(
    (validation) => validation.code === ROLLOVER_VALUE_REQUIRED_VALIDATION_CODE
  );
};
