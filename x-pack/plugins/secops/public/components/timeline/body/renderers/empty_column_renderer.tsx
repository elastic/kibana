/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { has } from 'lodash/fp';
import React from 'react';

import { ColumnRenderer, EMPTY_VALUE, plainColumnsOverridden } from '.';
import { ECS } from '../../ecs';

export const dataNotExistsAtColumn = (columnName: string, data: ECS): boolean => {
  switch (columnName) {
    case 'timestamp':
      return !has('timestamp', data);
    case 'severity':
      return !has('event.severity', data);
    case 'category':
      return !has('event.category', data);
    case 'type':
      return !has('event.type', data);
    case 'source':
      return !has('source.ip', data);
    case 'user':
      return !has('user.name', data);
    case 'event':
      return !has('event.id', data);
    default:
      // unknown column name
      return false;
  }
};

export const emptyColumnRenderer: ColumnRenderer = {
  isInstance: (columnName: string, ecs: ECS) =>
    plainColumnsOverridden.includes(columnName) && dataNotExistsAtColumn(columnName, ecs),

  renderColumn: (columnName: string, data: ECS) => <>{EMPTY_VALUE}</>,
};
