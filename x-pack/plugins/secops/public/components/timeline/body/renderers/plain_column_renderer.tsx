/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getOr, has } from 'lodash/fp';
import moment from 'moment';
import React from 'react';
import { ColumnRenderer } from '.';
import { ECS } from '../../ecs';

const columnsOverriden = ['timestamp', 'severity', 'category', 'type', 'source', 'user', 'event'];

export const dataExistsAtColumn = (columnName: string, data: ECS): boolean => {
  switch (columnName) {
    case 'timestamp':
      return has('timestamp', data);
    case 'severity':
      return has('event.severity', data);
    case 'category':
      return has('event.category', data);
    case 'type':
      return has('event.type', data);
    case 'source':
      return has('source.ip', data);
    case 'user':
      return has('user.name', data);
    case 'event':
      return has('event.id', data);
    default:
      // unknown column name
      return false;
  }
};

export const plainColumnRenderer: ColumnRenderer = {
  isInstance: (columnName: string, ecs: ECS) =>
    columnsOverriden.includes(columnName) && dataExistsAtColumn(columnName, ecs),

  renderColumn: (columnName: string, data: ECS) => {
    switch (columnName) {
      case 'timestamp':
        return <React.Fragment>{moment(data.timestamp).format('YYYY-MM-DD')}</React.Fragment>;
      case 'severity':
        return <React.Fragment>{data.event.severity}</React.Fragment>;
      case 'category':
        return <React.Fragment>{data.event.category}</React.Fragment>;
      case 'type':
        return <React.Fragment>{data.event.type}</React.Fragment>;
      case 'source':
        return <React.Fragment>{data.source.ip}</React.Fragment>;
      case 'user':
        return <React.Fragment>{getOr('--', 'user.name', data)}</React.Fragment>;
      case 'event':
        return <React.Fragment>{data.event.id}</React.Fragment>;
      default:
        // unknown column name
        return <React.Fragment>--</React.Fragment>;
    }
  },
};
