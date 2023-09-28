/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getFlattenedObject } from '@kbn/std';
import { cloneDeep, get, isObject, merge, omit } from 'lodash';

const expandDottedField = (dottedFieldName: string, val: unknown): object => {
  const parts = dottedFieldName.split('.');
  if (parts.length === 1) {
    return { [parts[0]]: val };
  } else {
    return { [parts[0]]: expandDottedField(parts.slice(1).join('.'), val) };
  }
};

export const expandFlattenedAlert = (alert: object) => {
  return Object.entries(alert).reduce(
    (acc, [key, val]) => merge(acc, expandDottedField(key, val)),
    {}
  );
};

/**
 * It is possible the executor reports back a flattened
 * payload but the existing alert is unflattened, so we want to merge
 * the two formats
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const formatAlertWithPayload = (alert: any, payload: object) => {
  // make a copy of the alert
  let alertCopy = cloneDeep(alert);
  Object.keys(payload).forEach((payloadKey: string) => {
    const val = get(alertCopy, payloadKey, null);
    if (null == alertCopy[payloadKey] && null != val && !isObject(val)) {
      alertCopy = omit(alertCopy, payloadKey);
    }
  });
  return alertCopy;
};
