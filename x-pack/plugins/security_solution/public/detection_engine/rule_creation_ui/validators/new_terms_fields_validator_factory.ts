/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { fieldValidators, type ERROR_CODE, type ValidationFunc } from '../../../shared_imports';
import { MAX_NUMBER_OF_NEW_TERMS_FIELDS } from '../../../../common/constants';

export function newTermsFieldsValidatorFactory(
  ...args: Parameters<ValidationFunc>
): ReturnType<ValidationFunc<{}, ERROR_CODE>> | undefined {
  return (
    fieldValidators.emptyField(
      i18n.translate(
        'xpack.securitySolution.detectionEngine.createRule.stepDefineRule.newTermsFieldsMin',
        {
          defaultMessage: 'A minimum of one field is required.',
        }
      )
    )(...args) ??
    fieldValidators.maxLengthField({
      length: MAX_NUMBER_OF_NEW_TERMS_FIELDS,
      message: i18n.translate(
        'xpack.securitySolution.detectionEngine.validations.stepDefineRule.newTermsFieldsMax',
        {
          defaultMessage: 'Number of fields must be 3 or less.',
        }
      ),
    })(...args)
  );
}
