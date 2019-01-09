/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Ecs } from '../../../../graphql/types';

export interface RowRenderer {
  isInstance: (data: Ecs) => boolean;
  renderRow: (data: Ecs, children: React.ReactNode) => React.ReactNode;
}
