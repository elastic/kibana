/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Ecs } from '../../../../graphql/types';
import { EcsField } from '../../../../lib/ecs';

export interface ColumnRenderer {
  isInstance: (columnName: string, data: Ecs) => boolean;
  renderColumn: (columnName: string, data: Ecs, field?: EcsField) => React.ReactNode;
}
