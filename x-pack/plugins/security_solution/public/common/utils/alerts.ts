/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { merge } from '@kbn/std';
import { isPlainObject } from 'lodash';
import { Ecs } from '../../../../cases/common';

// TODO we need to allow ->  docValueFields: [{ field: "@timestamp" }],
export const buildAlertsQuery = (alertIds: string[]) => {
  if (alertIds.length === 0) {
    return {};
  }
  return {
    query: {
      bool: {
        filter: {
          ids: {
            values: alertIds,
          },
        },
      },
    },
    size: 10000,
  };
};

export const toStringArray = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.reduce<string[]>((acc, v) => {
      if (v != null) {
        switch (typeof v) {
          case 'number':
          case 'boolean':
            return [...acc, v.toString()];
          case 'object':
            try {
              return [...acc, JSON.stringify(v)];
            } catch {
              return [...acc, 'Invalid Object'];
            }
          case 'string':
            return [...acc, v];
          default:
            return [...acc, `${v}`];
        }
      }
      return acc;
    }, []);
  } else if (value == null) {
    return [];
  } else if (!Array.isArray(value) && typeof value === 'object') {
    try {
      return [JSON.stringify(value)];
    } catch {
      return ['Invalid Object'];
    }
  } else {
    return [`${value}`];
  }
};

const formatAlertItem = (item: unknown): Ecs => {
  if (item != null && isPlainObject(item)) {
    return Object.keys(item as object).reduce(
      (acc, key) => ({
        ...acc,
        [key]: formatAlertItem((item as Record<string, unknown>)[key]),
      }),
      {} as Ecs
    );
  } else if (Array.isArray(item)) {
    return item.map((arrayItem): Ecs => formatAlertItem(arrayItem)) as unknown as Ecs;
  }
  return item as Ecs;
};

const expandDottedField = (dottedFieldName: string, val: unknown): object => {
  const parts = dottedFieldName.split('.');
  if (parts.length === 1) {
    return { [parts[0]]: val };
  } else {
    return { [parts[0]]: expandDottedField(parts.slice(1).join('.'), val) };
  }
};

/*
 * Expands an object with "dotted" fields to a nested object with unflattened fields.
 *
 * Example:
 *   expandDottedObject({
 *     "kibana.alert.depth": 1,
 *     "kibana.alert.ancestors": [{
 *       id: "d5e8eb51-a6a0-456d-8a15-4b79bfec3d71",
 *       type: "event",
 *       index: "signal_index",
 *       depth: 0,
 *     }],
 *   })
 *
 *   => {
 *     kibana: {
 *       alert: {
 *         ancestors: [
 *           id: "d5e8eb51-a6a0-456d-8a15-4b79bfec3d71",
 *           type: "event",
 *           index: "signal_index",
 *           depth: 0,
 *         ],
 *         depth: 1,
 *       },
 *     },
 *   }
 */
export const expandDottedObject = (dottedObj: object) => {
  if (Array.isArray(dottedObj)) {
    return dottedObj;
  }
  return Object.entries(dottedObj).reduce(
    (acc, [key, val]) => merge(acc, expandDottedField(key, val)),
    {}
  );
};

export const formatAlertToEcsSignal = (alert: Record<string, unknown>): Ecs => {
  return expandDottedObject(alert) as Ecs;
};

interface Signal {
  rule: {
    id: string;
    name: string;
    to: string;
    from: string;
  };
}

export interface SignalHit {
  _id: string;
  _index: string;
  _source: {
    '@timestamp': string;
    signal: Signal;
  };
}

export interface Alert {
  _id: string;
  _index: string;
  '@timestamp': string;
  signal: Signal;
  [key: string]: unknown;
}
