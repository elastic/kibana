/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { merge } from '@kbn/std';
import { isPlainObject } from 'lodash';
import type { Ecs } from '@kbn/cases-plugin/common';
import { TableId } from '@kbn/securitysolution-data-table';
import type { GroupOption } from '@kbn/securitysolution-grouping';
import * as i18n from './translations';

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

// generates default grouping option for alerts table
export const getDefaultGroupingOptions = (tableId: TableId): GroupOption[] => {
  if (tableId === TableId.alertsOnAlertsPage || tableId === TableId.alertsRiskInputs) {
    return [
      {
        label: i18n.ruleName,
        key: 'kibana.alert.rule.name',
      },
      {
        label: i18n.userName,
        key: 'user.name',
      },
      {
        label: i18n.hostName,
        key: 'host.name',
      },
      {
        label: i18n.sourceIP,
        key: 'source.ip',
      },
    ];
  } else if (tableId === TableId.alertsOnRuleDetailsPage) {
    return [
      {
        label: i18n.sourceAddress,
        key: 'source.address',
      },
      {
        label: i18n.userName,
        key: 'user.name',
      },
      {
        label: i18n.hostName,
        key: 'host.name',
      },
      {
        label: i18n.destinationAddress,
        key: 'destination.address,',
      },
    ];
  }
  return [];
};
