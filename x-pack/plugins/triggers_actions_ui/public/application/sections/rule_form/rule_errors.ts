/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { isObject } from 'lodash';
import { i18n } from '@kbn/i18n';
import { formatDuration, parseDuration } from '../../../../../alerting/common/parse_duration';
import {
  RuleTypeModel,
  Rule,
  IErrorObject,
  RuleAction,
  ValidationResult,
  ActionTypeRegistryContract,
  TriggersActionsUiConfig,
} from '../../../types';
import { InitialRule } from './rule_reducer';

export function validateBaseProperties(
  ruleObject: InitialRule,
  config: TriggersActionsUiConfig
): ValidationResult {
  const validationResult = { errors: {} };
  const errors = {
    name: new Array<string>(),
    'schedule.interval': new Array<string>(),
    ruleTypeId: new Array<string>(),
    actionConnectors: new Array<string>(),
  };
  validationResult.errors = errors;
  if (!ruleObject.name) {
    errors.name.push(
      i18n.translate('xpack.triggersActionsUI.sections.ruleForm.error.requiredNameText', {
        defaultMessage: 'Name is required.',
      })
    );
  }
  if (ruleObject.schedule.interval.length < 2) {
    errors['schedule.interval'].push(
      i18n.translate('xpack.triggersActionsUI.sections.ruleForm.error.requiredIntervalText', {
        defaultMessage: 'Check interval is required.',
      })
    );
  } else if (config.minimumScheduleInterval && config.minimumScheduleInterval.enforce) {
    const duration = parseDuration(ruleObject.schedule.interval);
    const minimumDuration = parseDuration(config.minimumScheduleInterval.value);
    if (duration < minimumDuration) {
      errors['schedule.interval'].push(
        i18n.translate('xpack.triggersActionsUI.sections.ruleForm.error.belowMinimumText', {
          defaultMessage: 'Interval must be at least {minimum}.',
          values: {
            minimum: formatDuration(config.minimumScheduleInterval.value, true),
          },
        })
      );
    }
  }

  if (!ruleObject.ruleTypeId) {
    errors.ruleTypeId.push(
      i18n.translate('xpack.triggersActionsUI.sections.ruleForm.error.requiredRuleTypeIdText', {
        defaultMessage: 'Rule type is required.',
      })
    );
  }
  const emptyConnectorActions = ruleObject.actions.find(
    (actionItem) => /^\d+$/.test(actionItem.id) && Object.keys(actionItem.params).length > 0
  );
  if (emptyConnectorActions !== undefined) {
    errors.actionConnectors.push(
      i18n.translate('xpack.triggersActionsUI.sections.ruleForm.error.requiredActionConnector', {
        defaultMessage: 'Action for {actionTypeId} connector is required.',
        values: { actionTypeId: emptyConnectorActions.actionTypeId },
      })
    );
  }
  return validationResult;
}

export function getRuleErrors(
  rule: Rule,
  ruleTypeModel: RuleTypeModel | null,
  config: TriggersActionsUiConfig
) {
  const ruleParamsErrors: IErrorObject = ruleTypeModel
    ? ruleTypeModel.validate(rule.params).errors
    : [];
  const ruleBaseErrors = validateBaseProperties(rule, config).errors as IErrorObject;
  const ruleErrors = {
    ...ruleParamsErrors,
    ...ruleBaseErrors,
  } as IErrorObject;

  return {
    ruleParamsErrors,
    ruleBaseErrors,
    ruleErrors,
  };
}

export async function getRuleActionErrors(
  rule: Rule,
  actionTypeRegistry: ActionTypeRegistryContract
): Promise<IErrorObject[]> {
  return await Promise.all(
    rule.actions.map(
      async (ruleAction: RuleAction) =>
        (
          await actionTypeRegistry.get(ruleAction.actionTypeId)?.validateParams(ruleAction.params)
        ).errors
    )
  );
}

export const hasObjectErrors: (errors: IErrorObject) => boolean = (errors) =>
  !!Object.values(errors).find((errorList) => {
    if (isObject(errorList)) return hasObjectErrors(errorList as IErrorObject);
    return errorList.length >= 1;
  });

export function isValidRule(
  ruleObject: InitialRule | Rule,
  validationResult: IErrorObject,
  actionsErrors: IErrorObject[]
): ruleObject is Rule {
  return (
    !hasObjectErrors(validationResult) &&
    actionsErrors.every((error: IErrorObject) => !hasObjectErrors(error))
  );
}
