/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RowRendererId } from '..';
import { Ecs } from '../../../ecs';
import { BrowserFields } from '../../../search_strategy/index_fields';

export interface RowRenderer {
  id: RowRendererId;
  isInstance: (data: Ecs) => boolean;
  renderRow: ({
    browserFields,
    data,
    timelineId,
  }: {
    browserFields: BrowserFields;
    data: Ecs;
    timelineId: string;
  }) => React.ReactNode;
}
