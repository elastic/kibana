/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { EuiText } from '@elastic/eui';
import { isEmpty } from 'lodash/fp';
import React from 'react';

import { isMlRule } from '../../../../../common/machine_learning/helpers';
import { esKuery } from '../../../../../../../../src/plugins/data/public';
import { FieldValueQueryBar } from '../query_bar';
import {
  ERROR_CODE,
  FIELD_TYPES,
  fieldValidators,
  FormSchema,
  ValidationFunc,
} from '../../../../shared_imports';
import { CUSTOM_QUERY_REQUIRED, INVALID_CUSTOM_QUERY, INDEX_HELPER_TEXT } from './translations';

export const schema: FormSchema = {
  index: {
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
          const needsValidation = !isMlRule(formData.ruleType);

          if (!needsValidation) {
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
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.createRule.stepDefineRule.fieldQuerBarLabel',
      {
        defaultMessage: 'Custom query',
      }
    ),
    validations: [
      {
        validator: (
          ...args: Parameters<ValidationFunc>
        ): ReturnType<ValidationFunc<{}, ERROR_CODE>> | undefined => {
          const [{ value, path, formData }] = args;
          const { query, filters } = value as FieldValueQueryBar;
          const needsValidation = !isMlRule(formData.ruleType);
          if (!needsValidation) {
            return;
          }

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
          const { query } = value as FieldValueQueryBar;
          const needsValidation = !isMlRule(formData.ruleType);
          if (!needsValidation) {
            return;
          }

          if (!isEmpty(query.query as string) && query.language === 'kuery') {
            try {
              esKuery.fromKueryExpression(query.query);
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
          defaultMessage: 'Field',
        }
      ),
      helpText: i18n.translate(
        'xpack.securitySolution.detectionEngine.createRule.stepAboutRule.fieldThresholdFieldHelpText',
        {
          defaultMessage: 'Select a field to group results by',
        }
      ),
    },
    value: {
      type: FIELD_TYPES.NUMBER,
      label: i18n.translate(
        'xpack.securitySolution.detectionEngine.createRule.stepAboutRule.fieldThresholdValueLabel',
        {
          defaultMessage: 'Threshold',
        }
      ),
    },
  },
};
