/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isNumber, isObject, isString } from 'lodash';
import { diff, Delta } from 'jsondiffpatch';
import { AlertsFilter } from '@kbn/alerting-plugin/common';
import { AuditLog } from '../common';
import { AuditDiffOperation } from '../common';

export type GetSummarizedAlertsParams = {
  ruleId: string;
  spaceId: string;
  excludedAlertInstanceIds: string[];
  alertsFilter?: AlertsFilter | null;
} & (
  | { start: Date; end: Date; executionUuid?: never }
  | { executionUuid: string; start?: never; end?: never }
);

export interface AuditDiff {
  [key: string]:
    | {
        operation: AuditDiffOperation.ADD;
        new: string | number;
      }
    | {
        operation: AuditDiffOperation.DELETE;
        old: string | number;
      }
    | {
        operation: AuditDiffOperation.UPDATE;
        new: string | number;
        old: string | number;
      }
    | {
        operation: AuditDiffOperation.MOVE;
        new: string | number;
        old: string | number;
      };
}

const flattenDiff = (delta: Delta): AuditDiff => {
  const result: AuditDiff = {};

  const isLeaf = (node: Delta) => Array.isArray(node);
  const isAdd = (node: Delta) => isLeaf(node) && node.length === 1;
  const isMove = (node: Delta) =>
    isLeaf(node) && node[0] === '' && isNumber(node[1]) && isNumber(node[2]);
  const isDelete = (node: Delta) => isLeaf(node) && node[1] === 0 && node[2] === 0;
  const isArray = (node: Delta) => node._t === 'a';

  const stringify = (value: any) => {
    if (isNumber(value) || isString(value)) {
      return value;
    }
    return JSON.stringify(value);
  };

  function flatten(_d: Delta, prefix = '', isParentArray = false) {
    for (const [key, value] of Object.entries(_d)) {
      if (key === '_t') {
        continue;
      }
      let wrappedKey = key;
      if (isParentArray) {
        wrappedKey = `[${key.replace(/_/, '')}]`;
      }
      const path = `${prefix}${wrappedKey}`;

      if (isObject(value) && !isLeaf(value)) {
        if (isArray(value)) {
          flatten(value, path, true);
        } else {
          flatten(value, `${path}.`, false);
        }
      }

      if (isLeaf(value)) {
        if (isAdd(value)) {
          result[path] = { operation: AuditDiffOperation.ADD, new: stringify(value[0]) };
        } else if (isDelete(value)) {
          result[path] = {
            operation: AuditDiffOperation.DELETE,
            old: stringify(value[0]),
          };
        } else if (isMove(value)) {
          result[path] = {
            operation: AuditDiffOperation.MOVE,
            old: stringify(value[2]),
            new: stringify(value[1]),
          };
        } else {
          result[path] = {
            operation: AuditDiffOperation.UPDATE,
            old: stringify(value[0]),
            new: stringify(value[1]),
          };
        }
      }
    }
  }

  flatten(delta);

  return result;
};

export const getAuditDiff = (auditLog: AuditLog) => {
  const { old: oldValue, new: newValue } = auditLog.data;
  return flattenDiff(diff(JSON.parse(oldValue || '{}'), JSON.parse(newValue || '{}')) || {});
};
