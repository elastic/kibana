/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ECS } from '../../ecs';

export interface RowRenderer {
  isInstance: (data: ECS) => boolean;
  renderRow: (data: ECS, children: React.ReactNode) => React.ReactNode;
}
