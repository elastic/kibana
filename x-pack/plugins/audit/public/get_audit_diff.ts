/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isNumber, isObject } from 'lodash';
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
        new: string;
      }
    | {
        operation: AuditDiffOperation.DELETE;
        old: string;
      }
    | {
        operation: AuditDiffOperation.UPDATE;
        new: string;
        old: string;
      }
    | {
        operation: AuditDiffOperation.MOVE;
        new: number;
        old: number;
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

  function flatten(_d: Delta, prefix = '', isParentArray = false) {
    for (const [key, value] of Object.entries(_d)) {
      if (key === '_t') {
        continue;
      }
      let wrappedKey = key;
      if (isParentArray) {
        wrappedKey = `[${key}]`;
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
          result[path] = { operation: AuditDiffOperation.ADD, new: JSON.stringify(value[0]) };
        } else if (isDelete(value)) {
          result[path] = {
            operation: AuditDiffOperation.DELETE,
            old: JSON.stringify(value[0]),
          };
        } else if (isMove(value)) {
          result[path] = {
            operation: AuditDiffOperation.MOVE,
            old: value[2],
            new: value[1],
          };
        } else {
          result[path] = {
            operation: AuditDiffOperation.UPDATE,
            old: JSON.stringify(value[0]),
            new: JSON.stringify(value[1]),
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
  return flattenDiff(diff(JSON.parse(oldValue), JSON.parse(newValue)) || {});
};
