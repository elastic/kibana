/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getOr, has } from 'lodash/fp';
import moment from 'moment';
import React from 'react';

import { ColumnRenderer, EMPTY_VALUE } from '.';
import { ECS } from '../../ecs';

export const plainColumnsOverridden = [
  'category',
  'destination',
  'event',
  'geo',
  'severity',
  'source',
  'timestamp',
  'type',
  'user',
];

export const dataExistsAtColumn = (columnName: string, data: ECS): boolean => {
  switch (columnName) {
    case 'category':
      return has('event.category', data);
    case 'destination':
      return has('destination.ip', data);
    case 'event':
      return has('event.id', data);
    case 'geo':
      return has('geo.region_name', data);
    case 'severity':
      return has('event.severity', data);
    case 'source':
      return has('source.ip', data);
    case 'timestamp':
      return has('timestamp', data);
    case 'type':
      return has('event.type', data);
    case 'user':
      return has('user.name', data);
    default:
      // unknown column name
      return false;
  }
};

export const plainColumnRenderer: ColumnRenderer = {
  isInstance: (columnName: string, ecs: ECS) =>
    plainColumnsOverridden.includes(columnName) && dataExistsAtColumn(columnName, ecs),

  renderColumn: (columnName: string, data: ECS) => {
    const getOrEmpty = getOr(EMPTY_VALUE);
    switch (columnName) {
      case 'category':
        return <>{getOrEmpty('event.category', data)}</>;
      case 'destination':
        return <>{getOrEmpty('destination.ip', data)}</>;
      case 'event':
        return <>{data.event.id}</>;
      case 'geo':
        return <>{getOrEmpty('geo.region_name', data)}</>;
      case 'severity':
        return <>{getOrEmpty('event.severity', data)}</>;
      case 'source':
        return <>{getOrEmpty('source.ip', data)}</>;
      case 'timestamp':
        return <>{moment(data.timestamp).format('YYYY-MM-DD')}</>;
      case 'type':
        return <>{getOrEmpty('event.type', data)}</>;
      case 'user':
        return <>{getOrEmpty('user.name', data)}</>;
      default:
        // unknown column name
        return <>{EMPTY_VALUE}</>;
    }
  },
};
