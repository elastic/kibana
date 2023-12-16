/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { forEach, isObject } from 'lodash';
import { detailedDiff, DetailedDiff } from 'deep-object-diff';
import { AuditLog } from '../common';

interface Diff {
  [key: string]: any;
}
export interface AuditDiff {
  added: Diff;
  updated: Diff;
  deleted: Diff;
}

function nestedToDotted(object: object) {
  const result: { [key: string]: any } = {};

  function flatten(obj: object, prefix = '') {
    forEach(obj, (value, key) => {
      if (isObject(value)) {
        flatten(value, `${prefix}${key}.`);
      } else {
        result[`${prefix}${key}`] = value;
      }
    });
  }

  flatten(object);

  return result;
}

export const getAuditDiff = (auditLog: AuditLog): AuditDiff => {
  const { old: oldValue, new: newValue } = auditLog.data;
  const oldRecord = JSON.parse(oldValue);
  const newRecord = JSON.parse(newValue);

  const diff: DetailedDiff = detailedDiff(oldRecord, newRecord) || {};

  return {
    added: nestedToDotted(diff.added),
    updated: nestedToDotted(diff.updated),
    deleted: nestedToDotted(diff.deleted),
  };
};
