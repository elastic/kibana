/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';

import { fieldValidators, ValidationFunc, ValidationConfig } from '../../../../shared_imports';

import { ROLLOVER_FORM_PATHS } from '../constants';

import { i18nTexts } from '../i18n_texts';
import { PolicyFromES } from '../../../../../common/types';
import { FormInternal, MinAgePhase } from '../types';

const { numberGreaterThanField, containsCharsField, emptyField, startsWithField } = fieldValidators;

const createIfNumberExistsValidator = ({
  than,
  message,
}: {
  than: number;
  message: string;
}): ValidationFunc<any, any, any> => {
  return (arg) => {
    if (arg.value) {
      return numberGreaterThanField({
        than,
        message,
      })({
        ...arg,
        value: parseInt(arg.value, 10),
      });
    }
  };
};

export const ifExistsNumberGreaterThanZero = createIfNumberExistsValidator({
  than: 0,
  message: i18nTexts.editPolicy.errors.numberGreatThan0Required,
});

export const ifExistsNumberNonNegative = createIfNumberExistsValidator({
  than: -1,
  message: i18nTexts.editPolicy.errors.nonNegativeNumberRequired,
});

/**
 * A special validation type used to keep track of validation errors for
 * the rollover threshold values not being set (e.g., age and doc count)
 */
export const ROLLOVER_EMPTY_VALIDATION = 'ROLLOVER_EMPTY_VALIDATION';

/**
 * An ILM policy requires that for rollover a value must be set for one of the threshold values.
 *
 * This validator checks that and updates form values by setting errors states imperatively to
 * indicate this error state.
 */
export const rolloverThresholdsValidator: ValidationFunc = ({ form, path }) => {
  const fields = form.getFields();
  if (
    !(
      fields[ROLLOVER_FORM_PATHS.maxAge]?.value ||
      fields[ROLLOVER_FORM_PATHS.maxDocs]?.value ||
      fields[ROLLOVER_FORM_PATHS.maxSize]?.value
    )
  ) {
    if (path === ROLLOVER_FORM_PATHS.maxAge) {
      return {
        code: ROLLOVER_EMPTY_VALIDATION,
        message: i18nTexts.editPolicy.errors.maximumAgeRequiredMessage,
      };
    } else if (path === ROLLOVER_FORM_PATHS.maxDocs) {
      return {
        code: ROLLOVER_EMPTY_VALIDATION,
        message: i18nTexts.editPolicy.errors.maximumDocumentsRequiredMessage,
      };
    } else {
      return {
        code: ROLLOVER_EMPTY_VALIDATION,
        message: i18nTexts.editPolicy.errors.maximumSizeRequiredMessage,
      };
    }
  } else {
    fields[ROLLOVER_FORM_PATHS.maxAge].clearErrors(ROLLOVER_EMPTY_VALIDATION);
    fields[ROLLOVER_FORM_PATHS.maxDocs].clearErrors(ROLLOVER_EMPTY_VALIDATION);
    fields[ROLLOVER_FORM_PATHS.maxSize].clearErrors(ROLLOVER_EMPTY_VALIDATION);
  }
};

export const integerValidator: ValidationFunc<FormInternal, string, string> = (arg) => {
  if (!Number.isInteger(Number(arg.value ?? ''))) {
    return { message: i18nTexts.editPolicy.errors.integerRequired };
  }
};

export const createPolicyNameValidations = ({
  policies,
  saveAsNewPolicy,
  originalPolicyName,
}: {
  policies: PolicyFromES[];
  saveAsNewPolicy: boolean;
  originalPolicyName?: string;
}): Array<ValidationConfig<FormInternal, string, string>> => {
  return [
    {
      validator: emptyField(i18nTexts.editPolicy.errors.policyNameRequiredMessage),
    },
    {
      validator: startsWithField({
        message: i18nTexts.editPolicy.errors.policyNameStartsWithUnderscoreErrorMessage,
        char: '_',
      }),
    },
    {
      validator: containsCharsField({
        message: i18nTexts.editPolicy.errors.policyNameContainsInvalidChars,
        chars: [',', ' '],
      }),
    },
    {
      validator: (arg) => {
        const policyName = arg.value;
        if (window.TextEncoder && new window.TextEncoder().encode(policyName).length > 255) {
          return {
            message: i18nTexts.editPolicy.errors.policyNameTooLongErrorMessage,
          };
        }
      },
    },
    {
      validator: (arg) => {
        const policyName = arg.value;
        if (saveAsNewPolicy && policyName === originalPolicyName) {
          return {
            message: i18nTexts.editPolicy.errors.policyNameMustBeDifferentErrorMessage,
          };
        } else if (policyName !== originalPolicyName) {
          const policyNames = policies.map((existingPolicy) => existingPolicy.name);
          if (policyNames.includes(policyName)) {
            return {
              message: i18nTexts.editPolicy.errors.policyNameAlreadyUsedErrorMessage,
            };
          }
        }
      },
    },
  ];
};

/**
 * This validator guarantees that the user does not specify a min_age
 * value smaller that the min_age of a previous phase.
 * For example, the user can't define '5 days' for cold phase if the
 * warm phase is set to '10 days'.
 */
export const minAgeGreaterThanPreviousPhase = (phase: MinAgePhase) => ({
  formData,
}: {
  formData: Record<string, number>;
}) => {
  if (phase === 'warm') {
    return;
  }

  const getValueFor = (_phase: MinAgePhase) => {
    const milli = formData[`_meta.${_phase}.minAgeToMilliSeconds`];

    const esFormat =
      milli >= 0
        ? formData[`phases.${_phase}.min_age`] + formData[`_meta.${_phase}.minAgeUnit`]
        : undefined;

    return {
      milli,
      esFormat,
    };
  };

  const minAgeValues = {
    warm: getValueFor('warm'),
    cold: getValueFor('cold'),
    frozen: getValueFor('frozen'),
    delete: getValueFor('delete'),
  };

  const i18nErrors = {
    greaterThanWarmPhase: i18n.translate(
      'xpack.indexLifecycleMgmt.editPolicy.minAgeSmallerThanWarmPhaseError',
      {
        defaultMessage: 'Must be greater or equal than the warm phase value ({value})',
        values: {
          value: minAgeValues.warm.esFormat,
        },
      }
    ),
    greaterThanColdPhase: i18n.translate(
      'xpack.indexLifecycleMgmt.editPolicy.minAgeSmallerThanColdPhaseError',
      {
        defaultMessage: 'Must be greater or equal than the cold phase value ({value})',
        values: {
          value: minAgeValues.cold.esFormat,
        },
      }
    ),
    greaterThanFrozenPhase: i18n.translate(
      'xpack.indexLifecycleMgmt.editPolicy.minAgeSmallerThanFrozenPhaseError',
      {
        defaultMessage: 'Must be greater or equal than the frozen phase value ({value})',
        values: {
          value: minAgeValues.frozen.esFormat,
        },
      }
    ),
  };

  if (phase === 'cold') {
    if (minAgeValues.warm.milli >= 0 && minAgeValues.cold.milli < minAgeValues.warm.milli) {
      return {
        message: i18nErrors.greaterThanWarmPhase,
      };
    }
    return;
  }

  if (phase === 'frozen') {
    if (minAgeValues.cold.milli >= 0 && minAgeValues.frozen.milli < minAgeValues.cold.milli) {
      return {
        message: i18nErrors.greaterThanColdPhase,
      };
    } else if (
      minAgeValues.warm.milli >= 0 &&
      minAgeValues.frozen.milli < minAgeValues.warm.milli
    ) {
      return {
        message: i18nErrors.greaterThanWarmPhase,
      };
    }
    return;
  }

  if (phase === 'delete') {
    if (minAgeValues.frozen.milli >= 0 && minAgeValues.delete.milli < minAgeValues.frozen.milli) {
      return {
        message: i18nErrors.greaterThanFrozenPhase,
      };
    } else if (
      minAgeValues.cold.milli >= 0 &&
      minAgeValues.delete.milli < minAgeValues.cold.milli
    ) {
      return {
        message: i18nErrors.greaterThanColdPhase,
      };
    } else if (
      minAgeValues.warm.milli >= 0 &&
      minAgeValues.delete.milli < minAgeValues.warm.milli
    ) {
      return {
        message: i18nErrors.greaterThanWarmPhase,
      };
    }
  }
};
