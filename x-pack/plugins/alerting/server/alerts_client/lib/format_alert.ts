/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cloneDeep, get, merge, omit } from 'lodash';

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
 * If we're replacing field values in an unflattened alert
 * with the flattened version, we want to remove the unflattened version
 * to avoid duplicate data in the doc
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const removeUnflattenedFieldsFromAlert = (alert: any, flattenedData: object) => {
  // make a copy of the alert
  let alertCopy = cloneDeep(alert);

  // for each flattened field in the flattened data object,
  // check whether that path exists in the unflattened alert
  // and omit it if it does
  Object.keys(flattenedData).forEach((payloadKey: string) => {
    const val = get(alertCopy, payloadKey, null);
    if (null == alertCopy[payloadKey] && null != val) {
      alertCopy = omit(alertCopy, payloadKey);
    }
  });
  return alertCopy;
};
