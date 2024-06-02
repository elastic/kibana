/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { InvestigateWidgetCreate, WorkflowBlock } from '@kbn/investigate-plugin/common';
import { compact } from 'lodash';
import React, { useState } from 'react';
import { WorkflowBlocksControl } from '../../components/workflow_blocks_control';
import { useAlertsWorkflowBlock } from './use_alerts_workflow_block';
import { useApmWorkflowBlock } from './use_apm_workflow_block';
import { useSloWorkflowBlock } from './use_slo_workflow_block';

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
  const [flyout, setFlyout] = useState<React.ReactNode | null>(null);
  const sloWorkflowBlock = useSloWorkflowBlock({
    setFlyout,
    onWidgetAdd,
  });

  const alertsWorkflowBlock = useAlertsWorkflowBlock({
    onWidgetAdd,
  });

  const apmWorkflowBlock = useApmWorkflowBlock({
    start,
    end,
    onWidgetAdd,
  });

  const blocks = isTimelineEmpty
    ? compact([sloWorkflowBlock, alertsWorkflowBlock, apmWorkflowBlock])
    : dynamicBlocks;

  if (!blocks.length) {
    return null;
  }

  return (
    <>
      {flyout}
      <WorkflowBlocksControl blocks={blocks} compressed={!isTimelineEmpty} />
    </>
  );
}
