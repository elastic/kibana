/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FIELD_TYPES, FormSchema } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { i18n } from '@kbn/i18n';
import { fieldFormatters, fieldValidators } from '@kbn/es-ui-shared-plugin/static/forms/helpers';
import { isBiggerThanGlobalMaxRetention } from './validations';

export const editDataRetentionFormSchema: FormSchema = {
  dataRetention: {
    type: FIELD_TYPES.TEXT,
    label: i18n.translate(
      'xpack.idxMgmt.dataStreamsDetailsPanel.editDataRetentionModal.dataRetentionField',
      {
        defaultMessage: 'Data retention period',
      }
    ),
    formatters: [fieldFormatters.toInt],
    validations: [
      {
        validator: fieldValidators.isInteger({
          message: i18n.translate(
            'xpack.idxMgmt.dataStreamsDetailsPanel.editDataRetentionModal.dataRetentionFieldIntegerError',
            {
              defaultMessage: 'Only integers are allowed.',
            }
          ),
        }),
      },
      {
        validator: ({ value, formData, customData }) => {
          // We only need to validate the data retention field if infiniteRetentionPeriod is set to false
          if (!formData.infiniteRetentionPeriod) {
            // If project level data retention is enabled, we need to enforce the global max retention
            const { globalMaxRetention, enableProjectLevelRetentionChecks } =
              customData.value as any;
            if (enableProjectLevelRetentionChecks) {
              return isBiggerThanGlobalMaxRetention(value, formData.timeUnit, globalMaxRetention);
            }
          }
        },
      },
      {
        validator: (args) => {
          // We only need to validate the data retention field if infiniteRetentionPeriod is set to false
          if (!args.formData.infiniteRetentionPeriod) {
            return fieldValidators.emptyField(
              i18n.translate(
                'xpack.idxMgmt.dataStreamsDetailsPanel.editDataRetentionModal.dataRetentionFieldRequiredError',
                {
                  defaultMessage: 'A data retention value is required.',
                }
              )
            )(args);
          }
        },
      },
      {
        validator: (args) => {
          // We only need to validate the data retention field if infiniteRetentionPeriod is set to false
          if (!args.formData.infiniteRetentionPeriod) {
            return fieldValidators.numberGreaterThanField({
              than: 0,
              allowEquality: false,
              message: i18n.translate(
                'xpack.idxMgmt.dataStreamsDetailsPanel.editDataRetentionModal.dataRetentionFieldNonNegativeError',
                {
                  defaultMessage: `A positive value is required.`,
                }
              ),
            })(args);
          }
        },
      },
    ],
  },
  timeUnit: {
    type: FIELD_TYPES.TEXT,
    label: i18n.translate(
      'xpack.idxMgmt.dataStreamsDetailsPanel.editDataRetentionModal.timeUnitField',
      {
        defaultMessage: 'Time unit',
      }
    ),
  },
  infiniteRetentionPeriod: {
    type: FIELD_TYPES.TOGGLE,
    defaultValue: false,
  },
  dataRetentionEnabled: {
    type: FIELD_TYPES.TOGGLE,
    defaultValue: false,
    label: i18n.translate(
      'xpack.idxMgmt.dataStreamsDetailsPanel.editDataRetentionModal.dataRetentionEnabledField',
      {
        defaultMessage: 'Enable data retention',
      }
    ),
  },
};
