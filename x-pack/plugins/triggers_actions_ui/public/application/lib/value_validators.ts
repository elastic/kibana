/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { constant, get, set } from 'lodash';
import { UserConfiguredActionConnector, IErrorObject, Alert } from '../../types';

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

export function getAlertWithInvalidatedFields(
  alert: Alert,
  paramsErrors: IErrorObject,
  baseAlertErrors: IErrorObject,
  actionsErrors: Record<string, IErrorObject>
) {
  Object.keys(paramsErrors).forEach((errorKey) => {
    if (paramsErrors[errorKey].length >= 1 && get(alert.params, errorKey) === undefined) {
      set(alert.params, errorKey, null);
    }
  });
  Object.keys(baseAlertErrors).forEach((errorKey) => {
    if (baseAlertErrors[errorKey].length >= 1 && get(alert, errorKey) === undefined) {
      set(alert, errorKey, null);
    }
  });
  Object.keys(actionsErrors).forEach((actionId) => {
    const actionToValidate = alert.actions.find((action) => action.id === actionId);
    Object.keys(actionsErrors[actionId]).forEach((errorKey) => {
      if (
        actionToValidate &&
        actionsErrors[actionId][errorKey].length >= 1 &&
        get(actionToValidate!.params, errorKey) === undefined
      ) {
        set(actionToValidate!.params, errorKey, null);
      }
    });
  });
  return alert;
}
