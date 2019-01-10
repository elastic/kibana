/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { ColumnRenderer, EMPTY_VALUE } from '.';
import { Ecs } from '../../../../graphql/types';

export const unknownColumnRenderer: ColumnRenderer = {
  isInstance: (columnName: string, data: Ecs) => true,
  renderColumn: (columnName: string, data: Ecs) => <>{EMPTY_VALUE}</>,
};
