/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { InvestigateWidgetCreate, WorkflowBlock } from '@kbn/investigate-plugin/common';
import { compact } from 'lodash';
import React from 'react';
import { WorkflowBlocksControl } from '../../components/workflow_blocks_control';

export function useWorkflowBlocks({
  isTimelineEmpty,
  dynamicBlocks,
  start,
  end,
  onWidgetAdd,
}: {
  isTimelineEmpty: boolean;
  dynamicBlocks: WorkflowBlock[];
  start: string;
  end: string;
  onWidgetAdd: (create: InvestigateWidgetCreate) => Promise<void>;
}) {
  const blocks = isTimelineEmpty ? compact([]) : dynamicBlocks;

  if (!blocks.length) {
    return null;
  }

  return <WorkflowBlocksControl blocks={blocks} compressed={!isTimelineEmpty} />;
}
