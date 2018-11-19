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
        return <React.Fragment>{getOrEmpty('event.category', data)}</React.Fragment>;
      case 'destination':
        return <React.Fragment>{getOrEmpty('destination.ip', data)}</React.Fragment>;
      case 'event':
        return <React.Fragment>{data.event.id}</React.Fragment>;
      case 'geo':
        return <React.Fragment>{getOrEmpty('geo.region_name', data)}</React.Fragment>;
      case 'severity':
        return <React.Fragment>{getOrEmpty('event.severity', data)}</React.Fragment>;
      case 'source':
        return <React.Fragment>{getOrEmpty('source.ip', data)}</React.Fragment>;
      case 'timestamp':
        return <React.Fragment>{moment(data.timestamp).format('YYYY-MM-DD')}</React.Fragment>;
      case 'type':
        return <React.Fragment>{getOrEmpty('event.type', data)}</React.Fragment>;
      case 'user':
        return <React.Fragment>{getOrEmpty('user.name', data)}</React.Fragment>;
      default:
        // unknown column name
        return <React.Fragment>{EMPTY_VALUE}</React.Fragment>;
    }
  },
};
