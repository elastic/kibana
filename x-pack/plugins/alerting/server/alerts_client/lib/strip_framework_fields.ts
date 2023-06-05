/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  cloneDeep,
  isArray,
  isEmpty,
  isFunction,
  fromPairs,
  isObject,
  isPlainObject,
  omit,
} from 'lodash';
import { ALERT_REASON } from '@kbn/rule-data-utils';
import { alertFieldMap } from '@kbn/alerts-as-data-utils';
import { RuleAlertData } from '../../types';

const allowedFrameworkFields: string[] = [ALERT_REASON];
/**
 * Updates an existing alert document with data from the LegacyAlert class
 * Currently only populates framework fields and not any rule type specific fields
 */

export const stripFrameworkFields = <AlertData extends RuleAlertData>(
  payload: AlertData
): AlertData => {
  const result = cloneDeep(payload);
  const keysToStrip = Object.keys(alertFieldMap).filter(
    (key: string) => !allowedFrameworkFields.includes(key)
  );
  // lodash omit can leave empty objects so we strip them from the result
  return removeEmptyObjects(omit(result, keysToStrip)) as AlertData;
};

type AlertTypes = string | number | boolean | object | AlertTypes[];
type AlertRecord = Record<string, AlertTypes>;
type AlertFields = AlertTypes | AlertRecord;

const removeEmptyObjects = (data: AlertFields): AlertFields => {
  if (isFunction(data) || !isPlainObject(data) || isArray(data)) return data;

  if (isArray(data)) return data.map(removeEmptyObjects);

  return fromPairs(
    Object.entries(data)
      .map(([k, v]) => [k, removeEmptyObjects(v)])
      .filter(([_, v]) => !(v == null || (isObject(v) && !isArray(v) && isEmpty(v))))
  );
};
