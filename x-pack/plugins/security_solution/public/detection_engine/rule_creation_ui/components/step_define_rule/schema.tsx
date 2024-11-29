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

import {
  singleEntryThreat,
  containsInvalidItems,
  customValidators,
} from '../../../../common/components/threat_match/helpers';
import {
  isEqlRule,
  isEqlSequenceQuery,
  isEsqlRule,
  isNewTermsRule,
  isThreatMatchRule,
  isThresholdRule,
  isSuppressionRuleConfiguredWithGroupBy,
} from '../../../../../common/detection_engine/utils';
import { MAX_NUMBER_OF_NEW_TERMS_FIELDS } from '../../../../../common/constants';
import { isMlRule } from '../../../../../common/machine_learning/helpers';
import type { ERROR_CODE, FormSchema, ValidationFunc } from '../../../../shared_imports';
import { FIELD_TYPES, fieldValidators } from '../../../../shared_imports';
import type { DefineStepRule } from '../../../../detections/pages/detection_engine/rules/types';
import { DataSourceType } from '../../../../detections/pages/detection_engine/rules/types';
import { dataViewIdValidatorFactory } from '../../validators/data_view_id_validator_factory';
import { indexPatternValidatorFactory } from '../../validators/index_pattern_validator_factory';
import { alertSuppressionFieldsValidatorFactory } from '../../validators/alert_suppression_fields_validator_factory';
import {
  ALERT_SUPPRESSION_DURATION_FIELD_NAME,
  ALERT_SUPPRESSION_FIELDS_FIELD_NAME,
  ALERT_SUPPRESSION_MISSING_FIELDS_FIELD_NAME,
} from '../../../rule_creation/components/alert_suppression_edit';
import * as alertSuppressionEditI81n from '../../../rule_creation/components/alert_suppression_edit/components/translations';
import {
  INDEX_HELPER_TEXT,
  THREAT_MATCH_INDEX_HELPER_TEXT,
  THREAT_MATCH_REQUIRED,
  THREAT_MATCH_EMPTIES,
  EQL_SEQUENCE_SUPPRESSION_GROUPBY_VALIDATION_TEXT,
} from './translations';
import { queryRequiredValidatorFactory } from '../../validators/query_required_validator_factory';
import { kueryValidatorFactory } from '../../validators/kuery_validator_factory';

export const schema: FormSchema<DefineStepRule> = {
  index: {
    defaultValue: [],
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
        validator: (...args) => {
          const [{ formData }] = args;

          if (
            isMlRule(formData.ruleType) ||
            isEsqlRule(formData.ruleType) ||
            formData.dataSourceType !== DataSourceType.IndexPatterns
          ) {
            return;
          }

          return indexPatternValidatorFactory()(...args);
        },
      },
    ],
  },
  dataViewId: {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.createRule.stepAboutRule.dataViewSelector',
      {
        defaultMessage: 'Data view',
      }
    ),
    fieldsToValidateOnChange: ['dataViewId'],
    validations: [
      {
        validator: (...args) => {
          const [{ formData }] = args;

          if (isMlRule(formData.ruleType) || formData.dataSourceType !== DataSourceType.DataView) {
            return;
          }

          return dataViewIdValidatorFactory()(...args);
        },
      },
    ],
  },
  dataViewTitle: {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.createRule.stepAboutRule.dataViewTitleSelector',
      {
        defaultMessage: 'Data view index pattern',
      }
    ),
    validations: [],
  },
  eqlOptions: {
    fieldsToValidateOnChange: ['eqlOptions', 'queryBar'],
  },
  queryBar: {
    fieldsToValidateOnChange: ['queryBar', ALERT_SUPPRESSION_FIELDS_FIELD_NAME],
    validations: [
      {
        validator: (...args) => {
          const [{ value, formData }] = args;

          if (isMlRule(formData.ruleType) || value.saved_id) {
            // Ignore field validation error in this case.
            // Instead, we show the error toast when saved query object does not exist.
            // https://github.com/elastic/kibana/issues/159060
            return;
          }

          return queryRequiredValidatorFactory(formData.ruleType)(...args);
        },
      },
      {
        validator: kueryValidatorFactory(),
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
  relatedIntegrations: {
    type: FIELD_TYPES.JSON,
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.createRule.stepAboutRule.fieldRelatedIntegrationsLabel',
      {
        defaultMessage: 'Related integrations',
      }
    ),
  },
  requiredFields: {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.createRule.stepAboutRule.fieldRequiredFieldsLabel',
      {
        defaultMessage: 'Required fields',
      }
    ),
    helpText: i18n.translate(
      'xpack.securitySolution.detectionEngine.createRule.stepAboutRule.fieldRequiredFieldsHelpText',
      {
        defaultMessage: 'Fields required for this Rule to function.',
      }
    ),
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
        validator: (...args) => {
          const [{ formData }] = args;
          if (!isThreatMatchRule(formData.ruleType)) {
            return;
          }

          return queryRequiredValidatorFactory(formData.ruleType)(...args);
        },
      },
      {
        validator: kueryValidatorFactory(),
      },
    ],
  },
  newTermsFields: {
    type: FIELD_TYPES.COMBO_BOX,
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.createRule.stepDefineRule.newTermsFieldsLabel',
      {
        defaultMessage: 'Fields',
      }
    ),
    helpText: i18n.translate(
      'xpack.securitySolution.detectionEngine.createRule.stepAboutRule.fieldNewTermsFieldHelpText',
      {
        defaultMessage: 'Select a field to check for new terms.',
      }
    ),
    validations: [
      {
        validator: (
          ...args: Parameters<ValidationFunc>
        ): ReturnType<ValidationFunc<{}, ERROR_CODE>> | undefined => {
          const [{ formData }] = args;
          const needsValidation = isNewTermsRule(formData.ruleType);
          if (!needsValidation) {
            return;
          }

          return fieldValidators.emptyField(
            i18n.translate(
              'xpack.securitySolution.detectionEngine.createRule.stepDefineRule.newTermsFieldsMin',
              {
                defaultMessage: 'A minimum of one field is required.',
              }
            )
          )(...args);
        },
      },
      {
        validator: (
          ...args: Parameters<ValidationFunc>
        ): ReturnType<ValidationFunc<{}, ERROR_CODE>> | undefined => {
          const [{ formData }] = args;
          const needsValidation = isNewTermsRule(formData.ruleType);
          if (!needsValidation) {
            return;
          }
          return fieldValidators.maxLengthField({
            length: MAX_NUMBER_OF_NEW_TERMS_FIELDS,
            message: i18n.translate(
              'xpack.securitySolution.detectionEngine.validations.stepDefineRule.newTermsFieldsMax',
              {
                defaultMessage: 'Number of fields must be 3 or less.',
              }
            ),
          })(...args);
        },
      },
    ],
  },
  historyWindowSize: {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.createRule.stepDefineRule.historyWindowSizeLabel',
      {
        defaultMessage: 'History Window Size',
      }
    ),
    helpText: i18n.translate(
      'xpack.securitySolution.detectionEngine.createRule.stepScheduleRule.historyWindowSizeHelpText',
      {
        defaultMessage: "New terms rules only alert if terms don't appear in historical data.",
      }
    ),
    validations: [
      {
        validator: (
          ...args: Parameters<ValidationFunc>
        ): ReturnType<ValidationFunc<{}, ERROR_CODE>> | undefined => {
          const [{ path, formData }] = args;
          const needsValidation = isNewTermsRule(formData.ruleType);

          if (!needsValidation) {
            return;
          }

          const filterTimeVal = formData.historyWindowSize.match(/\d+/g);

          if (filterTimeVal <= 0) {
            return {
              code: 'ERR_MIN_LENGTH',
              path,
              message: i18n.translate(
                'xpack.securitySolution.detectionEngine.validations.stepDefineRule.historyWindowSize.errMin',
                {
                  defaultMessage: 'History window size must be greater than 0.',
                }
              ),
            };
          }
        },
      },
    ],
  },
  [ALERT_SUPPRESSION_FIELDS_FIELD_NAME]: {
    validations: [
      {
        validator: (...args: Parameters<ValidationFunc>) => {
          const [{ formData }] = args;
          const needsValidation = isSuppressionRuleConfiguredWithGroupBy(formData.ruleType);

          if (!needsValidation) {
            return;
          }

          return alertSuppressionFieldsValidatorFactory()(...args);
        },
      },
      {
        validator: (
          ...args: Parameters<ValidationFunc>
        ): ReturnType<ValidationFunc<{}, ERROR_CODE>> | undefined => {
          const [{ formData, value }] = args;

          if (!isEqlRule(formData.ruleType) || !Array.isArray(value) || value.length === 0) {
            return;
          }

          const query: string = formData.queryBar?.query?.query ?? '';

          if (isEqlSequenceQuery(query)) {
            return {
              message: EQL_SEQUENCE_SUPPRESSION_GROUPBY_VALIDATION_TEXT,
            };
          }
        },
      },
    ],
  },
  [ALERT_SUPPRESSION_DURATION_FIELD_NAME]: {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.createRule.stepDefineRule.groupByDurationValueLabel',
      {
        defaultMessage: 'Suppress alerts for',
      }
    ),
  },
  [ALERT_SUPPRESSION_MISSING_FIELDS_FIELD_NAME]: {
    label: alertSuppressionEditI81n.ALERT_SUPPRESSION_MISSING_FIELDS_LABEL,
  },
  shouldLoadQueryDynamically: {
    type: FIELD_TYPES.CHECKBOX,
    defaultValue: false,
  },
};
