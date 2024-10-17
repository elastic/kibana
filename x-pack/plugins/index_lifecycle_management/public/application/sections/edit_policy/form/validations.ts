/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';

import moment from 'moment';
import {
  fieldValidators,
  ValidationFunc,
  ValidationConfig,
  ValidationError,
} from '../../../../shared_imports';

import { ROLLOVER_FORM_PATHS } from '../constants';

import { i18nTexts } from '../i18n_texts';
import { PhaseWithDownsample, PhaseWithTiming, PolicyFromES } from '../../../../../common/types';
import { FormInternal } from '../types';

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
export const ROLLOVER_VALUE_REQUIRED_VALIDATION_CODE = 'ROLLOVER_VALUE_REQUIRED_VALIDATION_CODE';

const rolloverFieldPaths = Object.values(ROLLOVER_FORM_PATHS);

/**
 * An ILM policy requires that for rollover a value must be set for one of the threshold values.
 *
 * This validator checks that and updates form values by setting errors states imperatively to
 * indicate this error state.
 */
export const rolloverThresholdsValidator: ValidationFunc = ({ form, path }) => {
  const fields = form.getFields();
  // At least one rollover field needs a value specified for this action.
  const someRolloverFieldHasAValue = rolloverFieldPaths.some((rolloverFieldPath) =>
    Boolean(fields[rolloverFieldPath]?.value)
  );
  if (!someRolloverFieldHasAValue) {
    const errorToReturn: ValidationError = {
      code: ROLLOVER_VALUE_REQUIRED_VALIDATION_CODE,
      message: '', // We need to map the current path to the corresponding validation error message
    };
    switch (path) {
      case ROLLOVER_FORM_PATHS.maxAge:
        errorToReturn.message = i18nTexts.editPolicy.errors.maximumAgeRequiredMessage;
        break;
      case ROLLOVER_FORM_PATHS.maxDocs:
        errorToReturn.message = i18nTexts.editPolicy.errors.maximumDocumentsRequiredMessage;
        break;
      case ROLLOVER_FORM_PATHS.maxPrimaryShardSize:
        errorToReturn.message = i18nTexts.editPolicy.errors.maximumPrimaryShardSizeRequiredMessage;
        break;
      case ROLLOVER_FORM_PATHS.maxPrimaryShardDocs:
        errorToReturn.message = i18nTexts.editPolicy.errors.maximumPrimaryShardDocsRequiredMessage;
        break;
      default:
        errorToReturn.message = i18nTexts.editPolicy.errors.maximumSizeRequiredMessage;
    }
    return errorToReturn;
  } else {
    rolloverFieldPaths.forEach((rolloverFieldPath) => {
      fields[rolloverFieldPath]?.clearErrors(ROLLOVER_VALUE_REQUIRED_VALIDATION_CODE);
    });
  }
};

export const createPolicyNameValidations = ({
  policies,
  isClonedPolicy,
  originalPolicyName,
}: {
  policies: PolicyFromES[];
  isClonedPolicy: boolean;
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
        if (isClonedPolicy && policyName === originalPolicyName) {
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
export const minAgeGreaterThanPreviousPhase =
  (phase: PhaseWithTiming) =>
  ({ formData }: { formData: Record<string, number> }) => {
    if (phase === 'warm') {
      return;
    }

    const getValueFor = (_phase: PhaseWithTiming) => {
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

export const downsampleIntervalMultipleOfPreviousOne =
  (phase: PhaseWithDownsample) =>
  ({ formData }: { formData: Record<string, any> }) => {
    if (phase === 'hot') return;

    const getValueFor = (_phase: PhaseWithDownsample) => {
      const intervalSize = formData[`_meta.${_phase}.downsample.fixedIntervalSize`];
      const intervalUnits = formData[`_meta.${_phase}.downsample.fixedIntervalUnits`];

      if (!intervalSize || !intervalUnits) {
        return null;
      }

      const milliseconds = moment.duration(intervalSize, intervalUnits).asMilliseconds();
      const esFormat = intervalSize + intervalUnits;

      return {
        milliseconds,
        esFormat,
      };
    };

    const intervalValues = {
      hot: getValueFor('hot'),
      warm: getValueFor('warm'),
      cold: getValueFor('cold'),
    };

    const checkIfGreaterAndMultiple = (nextInterval: number, previousInterval: number): boolean =>
      nextInterval > previousInterval && nextInterval % previousInterval === 0;

    if (phase === 'warm' && intervalValues.warm) {
      if (intervalValues.hot) {
        if (
          !checkIfGreaterAndMultiple(
            intervalValues.warm.milliseconds,
            intervalValues.hot.milliseconds
          )
        ) {
          return {
            message: i18n.translate(
              'xpack.indexLifecycleMgmt.editPolicy.downsamplePreviousIntervalWarmPhaseError',
              {
                defaultMessage:
                  'Must be greater than and a multiple of the hot phase value ({value})',
                values: {
                  value: intervalValues.hot.esFormat,
                },
              }
            ),
          };
        }
      }
    }

    if (phase === 'cold' && intervalValues.cold) {
      if (intervalValues.warm) {
        if (
          !checkIfGreaterAndMultiple(
            intervalValues.cold.milliseconds,
            intervalValues.warm.milliseconds
          )
        ) {
          return {
            message: i18n.translate(
              'xpack.indexLifecycleMgmt.editPolicy.downsamplePreviousIntervalColdPhaseWarmError',
              {
                defaultMessage:
                  'Must be greater than and a multiple of the warm phase value ({value})',
                values: {
                  value: intervalValues.warm.esFormat,
                },
              }
            ),
          };
        }
      } else if (intervalValues.hot) {
        if (
          !checkIfGreaterAndMultiple(
            intervalValues.cold.milliseconds,
            intervalValues.hot.milliseconds
          )
        ) {
          return {
            message: i18n.translate(
              'xpack.indexLifecycleMgmt.editPolicy.downsamplePreviousIntervalColdPhaseHotError',
              {
                defaultMessage:
                  'Must be greater than and a multiple of the hot phase value ({value})',
                values: {
                  value: intervalValues.hot.esFormat,
                },
              }
            ),
          };
        }
      }
    }
  };
