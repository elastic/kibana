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

export const dataExistsAtColumn = (columnName: string, data: ECS): boolean => has(columnName, data);

export const plainColumnRenderer: ColumnRenderer = {
  isInstance: (columnName: string, ecs: ECS) => dataExistsAtColumn(columnName, ecs),

  renderColumn: (columnName: string, data: ECS) => {
    const getOrEmpty = getOr(EMPTY_VALUE);

    return columnName !== 'timestamp' ? (
      <>{getOrEmpty(columnName, data)}</>
    ) : (
      <>{moment(data.timestamp).format()}</>
    );
  },
};
