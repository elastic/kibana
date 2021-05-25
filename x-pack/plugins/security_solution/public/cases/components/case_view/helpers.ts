/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isObject, get, isString, isNumber } from 'lodash';
import { useMemo } from 'react';
import { useSourcererScope } from '../../../common/containers/sourcerer';
import { SourcererScopeName } from '../../../common/store/sourcerer/model';
import { useQueryAlerts } from '../../../detections/containers/detection_engine/alerts/use_query';
import { Ecs } from '../../../../../cases/common';

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

export const formatAlertToEcsSignal = (alert: {}): Ecs =>
  Object.keys(alert).reduce<Ecs>((accumulator, key) => {
    const item = get(alert, key);
    if (item != null && isObject(item)) {
      return { ...accumulator, [key]: formatAlertToEcsSignal(item) };
    } else if (Array.isArray(item) || isString(item) || isNumber(item)) {
      return { ...accumulator, [key]: toStringArray(item) };
    }
    return accumulator;
  }, {} as Ecs);
interface Signal {
  rule: {
    id: string;
    name: string;
    to: string;
    from: string;
  };
}

interface SignalHit {
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
export const useFetchAlertData = (alertIds: string[]): [boolean, Record<string, Ecs>] => {
  const { selectedPatterns } = useSourcererScope(SourcererScopeName.detections);
  const alertsQuery = useMemo(() => buildAlertsQuery(alertIds), [alertIds]);

  const { loading: isLoadingAlerts, data: alertsData } = useQueryAlerts<SignalHit, unknown>({
    query: alertsQuery,
    indexName: selectedPatterns[0],
  });

  const alerts = useMemo(
    () =>
      alertsData?.hits.hits.reduce<Record<string, Ecs>>(
        (acc, { _id, _index, _source }) => ({
          ...acc,
          [_id]: {
            ...formatAlertToEcsSignal(_source),
            _id,
            _index,
            timestamp: _source['@timestamp'],
          },
        }),
        {}
      ) ?? {},
    [alertsData?.hits.hits]
  );

  return [isLoadingAlerts, alerts];
};
