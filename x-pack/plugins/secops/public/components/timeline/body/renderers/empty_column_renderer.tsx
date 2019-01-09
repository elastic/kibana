/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { has } from 'lodash/fp';
import React from 'react';

import { ColumnRenderer, EMPTY_VALUE } from '.';
import { Ecs } from '../../../../graphql/types';

export const dataNotExistsAtColumn = (columnName: string, data: Ecs): boolean =>
  !has(columnName, data);

export const emptyColumnRenderer: ColumnRenderer = {
  isInstance: (columnName: string, ecs: Ecs) => dataNotExistsAtColumn(columnName, ecs),

  renderColumn: (columnName: string, data: Ecs) => <>{EMPTY_VALUE}</>,
};
