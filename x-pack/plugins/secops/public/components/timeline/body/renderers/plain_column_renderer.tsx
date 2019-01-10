/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getOr, has } from 'lodash/fp';
import moment from 'moment';
import React from 'react';

import { ColumnRenderer, EMPTY_VALUE } from '.';
import { Ecs } from '../../../../graphql/types';

export const dataExistsAtColumn = (columnName: string, data: Ecs): boolean => has(columnName, data);

export const plainColumnRenderer: ColumnRenderer = {
  isInstance: (columnName: string, ecs: Ecs) => dataExistsAtColumn(columnName, ecs),

  renderColumn: (columnName: string, data: Ecs) => {
    return columnName !== 'timestamp' ? (
      <>{getOr(EMPTY_VALUE, columnName, data)}</>
    ) : (
      <>{moment(data!.timestamp!).format()}</>
    );
  },
};
