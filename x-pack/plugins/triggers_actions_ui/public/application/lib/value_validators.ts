/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { constant, get, set } from 'lodash';
import { UserConfiguredActionConnector, IErrorObject, Rule } from '../../types';

export function throwIfAbsent<T>(message: string) {
  return (value: T | undefined): T => {
    if (value === undefined || value === null) {
      throw new Error(message);
    }
    return value;
  };
}

export function throwIfIsntContained<T>(
  requiredValues: Set<string>,
  message: string | ((requiredValue: string) => string),
  valueExtractor: (value: T) => string
) {
  const toError = typeof message === 'function' ? message : constant(message);
  return (values: T[]) => {
    const availableValues = new Set(values.map(valueExtractor));
    for (const value of requiredValues.values()) {
      if (!availableValues.has(value)) {
        throw new Error(toError(value));
      }
    }
    return values;
  };
}

export const isValidUrl = (urlString: string, protocol?: string) => {
  try {
    const urlObject = new URL(urlString);
    if (protocol === undefined || urlObject.protocol === protocol) {
      return true;
    }
    return false;
  } catch (err) {
    return false;
  }
};

export function getConnectorWithInvalidatedFields(
  connector: UserConfiguredActionConnector<Record<string, unknown>, Record<string, unknown>>,
  configErrors: IErrorObject,
  secretsErrors: IErrorObject,
  baseConnectorErrors: IErrorObject
) {
  Object.keys(configErrors).forEach((errorKey) => {
    if (configErrors[errorKey].length >= 1 && get(connector.config, errorKey) === undefined) {
      set(connector.config, errorKey, null);
    }
  });
  Object.keys(secretsErrors).forEach((errorKey) => {
    if (secretsErrors[errorKey].length >= 1 && get(connector.secrets, errorKey) === undefined) {
      set(connector.secrets, errorKey, null);
    }
  });
  Object.keys(baseConnectorErrors).forEach((errorKey) => {
    if (baseConnectorErrors[errorKey].length >= 1 && get(connector, errorKey) === undefined) {
      set(connector, errorKey, null);
    }
  });
  return connector;
}

export function getRuleWithInvalidatedFields(
  rule: Rule,
  paramsErrors: IErrorObject,
  baseAlertErrors: IErrorObject,
  actionsErrors: IErrorObject[]
) {
  Object.keys(paramsErrors).forEach((errorKey) => {
    if (paramsErrors[errorKey].length >= 1 && get(rule.params, errorKey) === undefined) {
      set(rule.params, errorKey, null);
    }
  });
  Object.keys(baseAlertErrors).forEach((errorKey) => {
    if (baseAlertErrors[errorKey].length >= 1 && get(rule, errorKey) === undefined) {
      set(rule, errorKey, null);
    }
  });
  actionsErrors.forEach((error: IErrorObject, index: number) => {
    const actionToValidate = rule.actions.length > index ? rule.actions[index] : null;
    if (actionToValidate) {
      Object.keys(error).forEach((errorKey) => {
        if (error[errorKey].length >= 1 && get(actionToValidate!.params, errorKey) === undefined) {
          set(actionToValidate!.params, errorKey, null);
        }
      });
    }
  });
  return rule;
}
