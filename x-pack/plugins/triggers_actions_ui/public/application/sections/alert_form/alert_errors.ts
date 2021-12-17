/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { isObject } from 'lodash';
import { i18n } from '@kbn/i18n';
import { parseDuration } from '../../../../../alerting/common/parse_duration';
import {
  RuleTypeModel,
  Rule,
  IErrorObject,
  AlertAction,
  RuleType,
  ValidationResult,
  ActionTypeRegistryContract,
} from '../../../types';
import { InitialAlert } from './alert_reducer';

export function validateBaseProperties(
  alertObject: InitialAlert,
  serverRuleType?: RuleType<string, string>
): ValidationResult {
  const validationResult = { errors: {} };
  const errors = {
    name: new Array<string>(),
    interval: new Array<string>(),
    alertTypeId: new Array<string>(),
    actionConnectors: new Array<string>(),
  };
  validationResult.errors = errors;
  if (!alertObject.name) {
    errors.name.push(
      i18n.translate('xpack.triggersActionsUI.sections.alertForm.error.requiredNameText', {
        defaultMessage: 'Name is required.',
      })
    );
  }
  if (alertObject.schedule.interval.length < 2) {
    errors.interval.push(
      i18n.translate('xpack.triggersActionsUI.sections.alertForm.error.requiredIntervalText', {
        defaultMessage: 'Check interval is required.',
      })
    );
  } else if (serverRuleType?.minimumScheduleInterval) {
    const duration = parseDuration(alertObject.schedule.interval);
    const minimumDuration = parseDuration(serverRuleType.minimumScheduleInterval);
    if (duration < minimumDuration) {
      errors.interval.push(
        i18n.translate('xpack.triggersActionsUI.sections.alertForm.error.belowMinimumText', {
          defaultMessage: 'Interval is below minimum ({minimum}) for this rule type',
          values: {
            minimum: serverRuleType.minimumScheduleInterval,
          },
        })
      );
    }
  }

  if (!alertObject.alertTypeId) {
    errors.alertTypeId.push(
      i18n.translate('xpack.triggersActionsUI.sections.alertForm.error.requiredRuleTypeIdText', {
        defaultMessage: 'Rule type is required.',
      })
    );
  }
  const emptyConnectorActions = alertObject.actions.find(
    (actionItem) => /^\d+$/.test(actionItem.id) && Object.keys(actionItem.params).length > 0
  );
  if (emptyConnectorActions !== undefined) {
    errors.actionConnectors.push(
      i18n.translate('xpack.triggersActionsUI.sections.alertForm.error.requiredActionConnector', {
        defaultMessage: 'Action for {actionTypeId} connector is required.',
        values: { actionTypeId: emptyConnectorActions.actionTypeId },
      })
    );
  }
  return validationResult;
}

export function getAlertErrors(
  alert: Rule,
  alertTypeModel: RuleTypeModel | null,
  serverRuleType?: RuleType<string, string>
) {
  const alertParamsErrors: IErrorObject = alertTypeModel
    ? alertTypeModel.validate(alert.params).errors
    : [];
  const alertBaseErrors = validateBaseProperties(alert, serverRuleType).errors as IErrorObject;
  const alertErrors = {
    ...alertParamsErrors,
    ...alertBaseErrors,
  } as IErrorObject;

  return {
    alertParamsErrors,
    alertBaseErrors,
    alertErrors,
  };
}

export async function getAlertActionErrors(
  alert: Rule,
  actionTypeRegistry: ActionTypeRegistryContract
): Promise<IErrorObject[]> {
  return await Promise.all(
    alert.actions.map(
      async (alertAction: AlertAction) =>
        (
          await actionTypeRegistry.get(alertAction.actionTypeId)?.validateParams(alertAction.params)
        ).errors
    )
  );
}

export const hasObjectErrors: (errors: IErrorObject) => boolean = (errors) =>
  !!Object.values(errors).find((errorList) => {
    if (isObject(errorList)) return hasObjectErrors(errorList as IErrorObject);
    return errorList.length >= 1;
  });

export function isValidAlert(
  alertObject: InitialAlert | Rule,
  validationResult: IErrorObject,
  actionsErrors: IErrorObject[]
): alertObject is Rule {
  return (
    !hasObjectErrors(validationResult) &&
    actionsErrors.every((error: IErrorObject) => !hasObjectErrors(error))
  );
}
