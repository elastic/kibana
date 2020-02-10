/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { i18n } from '@kbn/i18n';
import { AlertTypeModel, ValidationResult } from '../../../../types';
import { IndexThresholdAlertTypeExpression } from './expression';
import { IndexThresholdAlertParams } from './types';
import { builtInGroupByTypes, builtInAggregationTypes } from '../../../../common/constants';

export function getAlertType(): AlertTypeModel {
  return {
    id: 'threshold',
    name: 'Index Threshold',
    iconClass: 'alert',
    alertParamsExpression: IndexThresholdAlertTypeExpression,
    validate: (alertParams: IndexThresholdAlertParams): ValidationResult => {
      const {
        index,
        timeField,
        aggType,
        aggField,
        groupBy,
        termSize,
        termField,
        threshold,
        timeWindowSize,
      } = alertParams;
      const validationResult = { errors: {} };
      const errors = {
        aggField: new Array<string>(),
        termSize: new Array<string>(),
        termField: new Array<string>(),
        timeWindowSize: new Array<string>(),
        threshold0: new Array<string>(),
        threshold1: new Array<string>(),
        index: new Array<string>(),
        timeField: new Array<string>(),
      };
      validationResult.errors = errors;
      if (!index || index.length === 0) {
        errors.index.push(
          i18n.translate('xpack.triggersActionsUI.sections.addAlert.error.requiredIndexText', {
            defaultMessage: 'Index is required.',
          })
        );
      }
      if (!timeField) {
        errors.timeField.push(
          i18n.translate('xpack.triggersActionsUI.sections.addAlert.error.requiredTimeFieldText', {
            defaultMessage: 'Time field is required.',
          })
        );
      }
      if (aggType && builtInAggregationTypes[aggType].fieldRequired && !aggField) {
        errors.aggField.push(
          i18n.translate('xpack.triggersActionsUI.sections.addAlert.error.requiredAggFieldText', {
            defaultMessage: 'Aggregation field is required.',
          })
        );
      }
      if (!termSize) {
        errors.termSize.push(
          i18n.translate('xpack.triggersActionsUI.sections.addAlert.error.requiredTermSizedText', {
            defaultMessage: 'Term size is required.',
          })
        );
      }
      if (!termField && groupBy && builtInGroupByTypes[groupBy].sizeRequired) {
        errors.termField.push(
          i18n.translate('xpack.triggersActionsUI.sections.addAlert.error.requiredtTermFieldText', {
            defaultMessage: 'Term field is required.',
          })
        );
      }
      if (!timeWindowSize) {
        errors.timeWindowSize.push(
          i18n.translate(
            'xpack.triggersActionsUI.sections.addAlert.error.requiredTimeWindowSizeText',
            {
              defaultMessage: 'Time window size is required.',
            }
          )
        );
      }
      if (threshold && threshold.length > 0 && !threshold[0]) {
        errors.threshold0.push(
          i18n.translate('xpack.triggersActionsUI.sections.addAlert.error.requiredThreshold0Text', {
            defaultMessage: 'Threshold0, is required.',
          })
        );
      }
      if (threshold && threshold.length > 1 && !threshold[1]) {
        errors.threshold1.push(
          i18n.translate('xpack.triggersActionsUI.sections.addAlert.error.requiredThreshold1Text', {
            defaultMessage: 'Threshold1 is required.',
          })
        );
      }
      return validationResult;
    },
    defaultActionMessage: 'Alert [{{ctx.metadata.name}}] has exceeded the threshold',
  };
}
