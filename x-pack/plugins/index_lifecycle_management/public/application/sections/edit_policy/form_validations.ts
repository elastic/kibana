/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { fieldValidators, ValidationFunc } from '../../../shared_imports';

import { i18nTexts } from './components/phases/hot_phase/i18n_texts';

import { ROLLOVER_FORM_PATHS } from './constants';

const { numberGreaterThanField } = fieldValidators;

export const positiveNumberRequiredMessage = i18n.translate(
  'xpack.indexLifecycleMgmt.editPolicy.numberAboveZeroRequiredError',
  {
    defaultMessage: 'Only numbers above 0 are allowed.',
  }
);

export const ifExistsNumberGreaterThanZero: ValidationFunc<any, any, any> = (arg) => {
  if (arg.value) {
    return numberGreaterThanField({
      than: 0,
      message: positiveNumberRequiredMessage,
    })({
      ...arg,
      value: parseInt(arg.value, 10),
    });
  }
};

/**
 * A special validation type used to keep track of validation errors for
 * the rollover threshold values not being set (e.g., age and doc count)
 */
export const ROLLOVER_EMPTY_VALIDATION = 'EMPTY';

/**
 * An ILM policy requires that for rollover a value must be set for one of the threshold values.
 *
 * This validator checks that and updates form values by setting errors states imperatively to
 * indicate this error state.
 */
export const rolloverThresholdsValidator: ValidationFunc = ({ form }) => {
  const fields = form.getFields();
  if (
    !(
      fields[ROLLOVER_FORM_PATHS.maxAge].value ||
      fields[ROLLOVER_FORM_PATHS.maxDocs].value ||
      fields[ROLLOVER_FORM_PATHS.maxSize].value
    )
  ) {
    fields[ROLLOVER_FORM_PATHS.maxAge].setErrors([
      { validationType: ROLLOVER_EMPTY_VALIDATION, message: i18nTexts.maximumAgeRequiredMessage },
    ]);
    fields[ROLLOVER_FORM_PATHS.maxDocs].setErrors([
      {
        validationType: ROLLOVER_EMPTY_VALIDATION,
        message: i18nTexts.maximumDocumentsRequiredMessage,
      },
    ]);
    fields[ROLLOVER_FORM_PATHS.maxSize].setErrors([
      { validationType: ROLLOVER_EMPTY_VALIDATION, message: i18nTexts.maximumSizeRequiredMessage },
    ]);
  } else {
    fields[ROLLOVER_FORM_PATHS.maxAge].clearErrors(ROLLOVER_EMPTY_VALIDATION);
    fields[ROLLOVER_FORM_PATHS.maxDocs].clearErrors(ROLLOVER_EMPTY_VALIDATION);
    fields[ROLLOVER_FORM_PATHS.maxSize].clearErrors(ROLLOVER_EMPTY_VALIDATION);
  }
};
