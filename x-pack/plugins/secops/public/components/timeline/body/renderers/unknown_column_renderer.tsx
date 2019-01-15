/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { ColumnRenderer } from '.';
import { Ecs } from '../../../../graphql/types';
import { getEmptyValue } from '../../../empty_value';

export const unknownColumnRenderer: ColumnRenderer = {
  isInstance: (columnName: string, data: Ecs) => true,
  renderColumn: (columnName: string, data: Ecs) => <>{getEmptyValue()}</>,
};
