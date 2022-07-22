/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get } from 'lodash/fp';
import React from 'react';

import type { RowRenderer } from '../../../../../../../common/types/timeline';
import { RowRendererId } from '../../../../../../../common/types/timeline';

import { RowRendererContainer } from '../row_renderer';
import { SuricataDetails } from './suricata_details';

export const suricataRowRenderer: RowRenderer = {
  id: RowRendererId.suricata,
  isInstance: (ecs) => {
    const module: string | null | undefined = get('event.module[0]', ecs);
    return module != null && module.toLowerCase() === 'suricata';
  },
  renderRow: ({ data, isDraggable, timelineId }) => (
    <RowRendererContainer>
      <SuricataDetails data={data} isDraggable={isDraggable} timelineId={timelineId} />
    </RowRendererContainer>
  ),
};
