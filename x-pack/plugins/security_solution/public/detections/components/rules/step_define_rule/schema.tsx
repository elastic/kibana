/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty } from 'lodash';
import { i18n } from '@kbn/i18n';
import { EuiText } from '@elastic/eui';
import React from 'react';

import { fromKueryExpression } from '@kbn/es-query';
import {
  singleEntryThreat,
  containsInvalidItems,
  customValidators,
} from '../../../../common/components/threat_match/helpers';
import {
  isEqlRule,
  isThreatMatchRule,
  isThresholdRule,
} from '../../../../../common/detection_engine/utils';
import { isMlRule } from '../../../../../common/machine_learning/helpers';
import { FieldValueQueryBar } from '../query_bar';
import {
  ERROR_CODE,
  FIELD_TYPES,
  fieldValidators,
  FormSchema,
  ValidationFunc,
} from '../../../../shared_imports';
import { DefineStepRule } from '../../../pages/detection_engine/rules/types';
import { debounceAsync, eqlValidator } from '../eql_query_bar/validators';
import {
  CUSTOM_QUERY_REQUIRED,
  EQL_QUERY_REQUIRED,
  INVALID_CUSTOM_QUERY,
  INDEX_HELPER_TEXT,
  THREAT_MATCH_INDEX_HELPER_TEXT,
  THREAT_MATCH_REQUIRED,
  THREAT_MATCH_EMPTIES,
} from './translations';

export const schema: FormSchema<DefineStepRule> = {
  index: {
    fieldsToValidateOnChange: ['index', 'queryBar'],
    type: FIELD_TYPES.COMBO_BOX,
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.createRule.stepAboutRule.fiedIndexPatternsLabel',
      {
        defaultMessage: 'Index patterns',
      }
    ),
    helpText: <EuiText size="xs">{INDEX_HELPER_TEXT}</EuiText>,
    validations: [
      {
        validator: (
          ...args: Parameters<ValidationFunc>
        ): ReturnType<ValidationFunc<{}, ERROR_CODE>> | undefined => {
          const [{ formData }] = args;
          const skipValidation = isMlRule(formData.ruleType) || formData.dataViewId != null;

          if (skipValidation) {
            return;
          }

          return fieldValidators.emptyField(
            i18n.translate(
              'xpack.securitySolution.detectionEngine.createRule.stepDefineRule.outputIndiceNameFieldRequiredError',
              {
                defaultMessage: 'A minimum of one index pattern is required.',
              }
            )
          )(...args);
        },
      },
    ],
  },
  dataViewId: {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.createRule.stepAboutRule.fiedIndexPatternsLabel',
      {
        defaultMessage: 'Data Views',
      }
    ),
    validations: [
      {
        validator: (
          ...args: Parameters<ValidationFunc>
        ): ReturnType<ValidationFunc<{}, ERROR_CODE>> | undefined => {
          const [{ formData }] = args;
          const skipValidation = isMlRule(formData.ruleType) || formData.index != null;

          if (skipValidation) {
            return;
          }

          return fieldValidators.emptyField(
            i18n.translate(
              'xpack.securitySolution.detectionEngine.createRule.stepDefineRule.outputIndiceNameFieldRequiredError',
              {
                defaultMessage: 'A minimum of one index pattern is required.',
              }
            )
          )(...args);
        },
      },
    ],
  },
  queryBar: {
    validations: [
      {
        validator: (
          ...args: Parameters<ValidationFunc>
        ): ReturnType<ValidationFunc<{}, ERROR_CODE>> | undefined => {
          const [{ value, path, formData }] = args;
          const { query, filters } = value as FieldValueQueryBar;
          const needsValidation = !isMlRule(formData.ruleType);
          if (!needsValidation) {
            return undefined;
          }
          const isFieldEmpty = isEmpty(query.query as string) && isEmpty(filters);
          if (!isFieldEmpty) {
            return undefined;
          }
          const message = isEqlRule(formData.ruleType) ? EQL_QUERY_REQUIRED : CUSTOM_QUERY_REQUIRED;
          return { code: 'ERR_FIELD_MISSING', path, message };
        },
      },
      {
        validator: (
          ...args: Parameters<ValidationFunc>
        ): ReturnType<ValidationFunc<{}, ERROR_CODE>> | undefined => {
          const [{ value, path, formData }] = args;
          const { query } = value as FieldValueQueryBar;
          const needsValidation = !isMlRule(formData.ruleType);
          if (!needsValidation) {
            return;
          }

          if (!isEmpty(query.query as string) && query.language === 'kuery') {
            try {
              fromKueryExpression(query.query);
            } catch (err) {
              return {
                code: 'ERR_FIELD_FORMAT',
                path,
                message: INVALID_CUSTOM_QUERY,
              };
            }
          }
        },
      },
      {
        validator: debounceAsync(eqlValidator, 300),
      },
    ],
  },
  ruleType: {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.createRule.stepDefineRule.fieldRuleTypeLabel',
      {
        defaultMessage: 'Rule type',
      }
    ),
    validations: [],
  },
  anomalyThreshold: {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.createRule.stepDefineRule.fieldAnomalyThresholdLabel',
      {
        defaultMessage: 'Anomaly score threshold',
      }
    ),
    validations: [],
  },
  machineLearningJobId: {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.createRule.stepDefineRule.fieldMachineLearningJobIdLabel',
      {
        defaultMessage: 'Machine Learning job',
      }
    ),
    validations: [
      {
        validator: (
          ...args: Parameters<ValidationFunc>
        ): ReturnType<ValidationFunc<{}, ERROR_CODE>> | undefined => {
          const [{ formData }] = args;
          const needsValidation = isMlRule(formData.ruleType);

          if (!needsValidation) {
            return;
          }

          return fieldValidators.emptyField(
            i18n.translate(
              'xpack.securitySolution.detectionEngine.createRule.stepDefineRule.machineLearningJobIdRequired',
              {
                defaultMessage: 'A Machine Learning job is required.',
              }
            )
          )(...args);
        },
      },
    ],
  },
  timeline: {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.createRule.stepAboutRule.fieldTimelineTemplateLabel',
      {
        defaultMessage: 'Timeline template',
      }
    ),
    helpText: i18n.translate(
      'xpack.securitySolution.detectionEngine.createRule.stepAboutRule.fieldTimelineTemplateHelpText',
      {
        defaultMessage: 'Select which timeline to use when investigating generated alerts.',
      }
    ),
  },
  threshold: {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.createRule.stepDefineRule.fieldThresholdLabel',
      {
        defaultMessage: 'Threshold',
      }
    ),
    field: {
      type: FIELD_TYPES.COMBO_BOX,
      label: i18n.translate(
        'xpack.securitySolution.detectionEngine.createRule.stepAboutRule.fieldThresholdFieldLabel',
        {
          defaultMessage: 'Group by',
        }
      ),
      helpText: i18n.translate(
        'xpack.securitySolution.detectionEngine.createRule.stepAboutRule.fieldThresholdFieldHelpText',
        {
          defaultMessage: "Select fields to group by. Fields are joined together with 'AND'",
        }
      ),
      validations: [
        {
          validator: (
            ...args: Parameters<ValidationFunc>
          ): ReturnType<ValidationFunc<{}, ERROR_CODE>> | undefined => {
            const [{ formData }] = args;
            const needsValidation = isThresholdRule(formData.ruleType);
            if (!needsValidation) {
              return;
            }
            return fieldValidators.maxLengthField({
              length: 3,
              message: i18n.translate(
                'xpack.securitySolution.detectionEngine.validations.thresholdFieldFieldData.arrayLengthGreaterThanMaxErrorMessage',
                {
                  defaultMessage: 'Number of fields must be 3 or less.',
                }
              ),
            })(...args);
          },
        },
      ],
    },
    value: {
      type: FIELD_TYPES.NUMBER,
      label: i18n.translate(
        'xpack.securitySolution.detectionEngine.createRule.stepAboutRule.fieldThresholdValueLabel',
        {
          defaultMessage: 'Threshold',
        }
      ),
      validations: [
        {
          validator: (
            ...args: Parameters<ValidationFunc>
          ): ReturnType<ValidationFunc<{}, ERROR_CODE>> | undefined => {
            const [{ formData }] = args;
            const needsValidation = isThresholdRule(formData.ruleType);
            if (!needsValidation) {
              return;
            }
            return fieldValidators.numberGreaterThanField({
              than: 1,
              message: i18n.translate(
                'xpack.securitySolution.detectionEngine.validations.thresholdValueFieldData.numberGreaterThanOrEqualOneErrorMessage',
                {
                  defaultMessage: 'Value must be greater than or equal to one.',
                }
              ),
              allowEquality: true,
            })(...args);
          },
        },
      ],
    },
    cardinality: {
      field: {
        defaultValue: [],
        fieldsToValidateOnChange: ['threshold.cardinality.field', 'threshold.cardinality.value'],
        type: FIELD_TYPES.COMBO_BOX,
        label: i18n.translate(
          'xpack.securitySolution.detectionEngine.createRule.stepDefineRule.fieldThresholdCardinalityFieldLabel',
          {
            defaultMessage: 'Count',
          }
        ),
        validations: [
          {
            validator: (
              ...args: Parameters<ValidationFunc>
            ): ReturnType<ValidationFunc<{}, ERROR_CODE>> | undefined => {
              const [{ formData }] = args;
              const needsValidation = isThresholdRule(formData.ruleType);
              if (!needsValidation) {
                return;
              }
              if (
                isEmpty(formData['threshold.cardinality.field']) &&
                !isEmpty(formData['threshold.cardinality.value'])
              ) {
                return fieldValidators.emptyField(
                  i18n.translate(
                    'xpack.securitySolution.detectionEngine.validations.thresholdCardinalityFieldFieldData.thresholdCardinalityFieldNotSuppliedMessage',
                    {
                      defaultMessage: 'A Cardinality Field is required.',
                    }
                  )
                )(...args);
              }
            },
          },
        ],
        helpText: i18n.translate(
          'xpack.securitySolution.detectionEngine.createRule.stepDefineRule.fieldThresholdFieldCardinalityFieldHelpText',
          {
            defaultMessage: 'Select a field to check cardinality',
          }
        ),
      },
      value: {
        fieldsToValidateOnChange: ['threshold.cardinality.field', 'threshold.cardinality.value'],
        type: FIELD_TYPES.NUMBER,
        label: i18n.translate(
          'xpack.securitySolution.detectionEngine.createRule.stepDefineRule.fieldThresholdCardinalityValueFieldLabel',
          {
            defaultMessage: 'Unique values',
          }
        ),
        validations: [
          {
            validator: (
              ...args: Parameters<ValidationFunc>
            ): ReturnType<ValidationFunc<{}, ERROR_CODE>> | undefined => {
              const [{ formData }] = args;
              const needsValidation = isThresholdRule(formData.ruleType);
              if (!needsValidation) {
                return;
              }
              if (!isEmpty(formData['threshold.cardinality.field'])) {
                return fieldValidators.numberGreaterThanField({
                  than: 1,
                  message: i18n.translate(
                    'xpack.securitySolution.detectionEngine.validations.thresholdCardinalityValueFieldData.numberGreaterThanOrEqualOneErrorMessage',
                    {
                      defaultMessage: 'Value must be greater than or equal to one.',
                    }
                  ),
                  allowEquality: true,
                })(...args);
              }
            },
          },
        ],
      },
    },
  },
  threatIndex: {
    type: FIELD_TYPES.COMBO_BOX,
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.createRule.stepDefineRule.fieldThreatIndexPatternsLabel',
      {
        defaultMessage: 'Indicator index patterns',
      }
    ),
    helpText: <EuiText size="xs">{THREAT_MATCH_INDEX_HELPER_TEXT}</EuiText>,
    validations: [
      {
        validator: (
          ...args: Parameters<ValidationFunc>
        ): ReturnType<ValidationFunc<{}, ERROR_CODE>> | undefined => {
          const [{ formData }] = args;
          const needsValidation = isThreatMatchRule(formData.ruleType);
          if (!needsValidation) {
            return;
          }
          return fieldValidators.emptyField(
            i18n.translate(
              'xpack.securitySolution.detectionEngine.createRule.stepDefineRule.threatMatchoutputIndiceNameFieldRequiredError',
              {
                defaultMessage: 'A minimum of one index pattern is required.',
              }
            )
          )(...args);
        },
      },
      {
        validator: (
          ...args: Parameters<ValidationFunc>
        ): ReturnType<ValidationFunc<{}, ERROR_CODE>> | undefined => {
          const [{ formData, value }] = args;
          const needsValidation = isThreatMatchRule(formData.ruleType);
          if (!needsValidation) {
            return;
          }

          return customValidators.forbiddenField(value, '*');
        },
      },
    ],
  },
  threatMapping: {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.createRule.stepDefineRule.fieldThreatMappingLabel',
      {
        defaultMessage: 'Indicator mapping',
      }
    ),
    validations: [
      {
        validator: (
          ...args: Parameters<ValidationFunc>
        ): ReturnType<ValidationFunc<{}, ERROR_CODE>> | undefined => {
          const [{ path, formData }] = args;
          const needsValidation = isThreatMatchRule(formData.ruleType);
          if (!needsValidation) {
            return;
          }
          if (singleEntryThreat(formData.threatMapping)) {
            return {
              code: 'ERR_FIELD_MISSING',
              path,
              message: THREAT_MATCH_REQUIRED,
            };
          } else if (containsInvalidItems(formData.threatMapping)) {
            return {
              code: 'ERR_FIELD_MISSING',
              path,
              message: THREAT_MATCH_EMPTIES,
            };
          } else {
            return undefined;
          }
        },
      },
    ],
  },
  threatQueryBar: {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.createRule.stepDefineRule.fieldThreatQueryBarLabel',
      {
        defaultMessage: 'Indicator index query',
      }
    ),
    validations: [
      {
        validator: (
          ...args: Parameters<ValidationFunc>
        ): ReturnType<ValidationFunc<{}, ERROR_CODE>> | undefined => {
          const [{ value, path, formData }] = args;
          const needsValidation = isThreatMatchRule(formData.ruleType);
          if (!needsValidation) {
            return;
          }

          const { query, filters } = value as FieldValueQueryBar;

          return isEmpty(query.query as string) && isEmpty(filters)
            ? {
                code: 'ERR_FIELD_MISSING',
                path,
                message: CUSTOM_QUERY_REQUIRED,
              }
            : undefined;
        },
      },
      {
        validator: (
          ...args: Parameters<ValidationFunc>
        ): ReturnType<ValidationFunc<{}, ERROR_CODE>> | undefined => {
          const [{ value, path, formData }] = args;
          const needsValidation = isThreatMatchRule(formData.ruleType);
          if (!needsValidation) {
            return;
          }
          const { query } = value as FieldValueQueryBar;

          if (!isEmpty(query.query as string) && query.language === 'kuery') {
            try {
              fromKueryExpression(query.query);
            } catch (err) {
              return {
                code: 'ERR_FIELD_FORMAT',
                path,
                message: INVALID_CUSTOM_QUERY,
              };
            }
          }
        },
      },
    ],
  },
};
