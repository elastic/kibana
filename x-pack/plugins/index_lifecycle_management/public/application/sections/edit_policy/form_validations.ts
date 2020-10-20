/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { fieldValidators, ValidationFunc } from '../../../shared_imports';

import { ROLLOVER_FORM_PATHS } from './constants';

import { i18nTexts } from './i18n_texts';

const { numberGreaterThanField } = fieldValidators;

export const ifExistsNumberGreaterThanZero: ValidationFunc<any, any, any> = (arg) => {
  if (arg.value) {
    return numberGreaterThanField({
      than: 0,
      message: i18nTexts.editPolicy.errors.numberGreatThan0Required,
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
      {
        validationType: ROLLOVER_EMPTY_VALIDATION,
        message: i18nTexts.editPolicy.errors.maximumAgeRequiredMessage,
      },
    ]);
    fields[ROLLOVER_FORM_PATHS.maxDocs].setErrors([
      {
        validationType: ROLLOVER_EMPTY_VALIDATION,
        message: i18nTexts.editPolicy.errors.maximumDocumentsRequiredMessage,
      },
    ]);
    fields[ROLLOVER_FORM_PATHS.maxSize].setErrors([
      {
        validationType: ROLLOVER_EMPTY_VALIDATION,
        message: i18nTexts.editPolicy.errors.maximumSizeRequiredMessage,
      },
    ]);
  } else {
    fields[ROLLOVER_FORM_PATHS.maxAge].clearErrors(ROLLOVER_EMPTY_VALIDATION);
    fields[ROLLOVER_FORM_PATHS.maxDocs].clearErrors(ROLLOVER_EMPTY_VALIDATION);
    fields[ROLLOVER_FORM_PATHS.maxSize].clearErrors(ROLLOVER_EMPTY_VALIDATION);
  }
};
