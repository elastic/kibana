/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { has } from 'lodash/fp';
import React from 'react';

import { ColumnRenderer, EMPTY_VALUE } from '.';
import { ECS } from '../../ecs';

export const dataNotExistsAtColumn = (columnName: string, data: ECS): boolean =>
  !has(columnName, data);

export const emptyColumnRenderer: ColumnRenderer = {
  isInstance: (columnName: string, ecs: ECS) => dataNotExistsAtColumn(columnName, ecs),

  renderColumn: (columnName: string, data: ECS) => <>{EMPTY_VALUE}</>,
};
