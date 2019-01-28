/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { has } from 'lodash/fp';
import moment from 'moment';
import React from 'react';

import { ColumnRenderer } from '.';
import { Ecs } from '../../../../graphql/types';
import { getOrEmptyTag } from '../../../empty_value';

export const dataExistsAtColumn = (columnName: string, data: Ecs): boolean => has(columnName, data);

export const plainColumnRenderer: ColumnRenderer = {
  isInstance: (columnName: string, ecs: Ecs) => dataExistsAtColumn(columnName, ecs),

  renderColumn: (columnName: string, data: Ecs) => {
    return columnName !== 'timestamp' ? (
      getOrEmptyTag(columnName, data)
    ) : (
      <>{moment(data!.timestamp!).format()}</>
    );
  },
};
