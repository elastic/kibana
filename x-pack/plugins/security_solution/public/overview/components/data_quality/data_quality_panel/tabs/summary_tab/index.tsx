/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import React from 'react';

import { CalloutSummary } from './callout_summary';
import { EcsGoalChart } from '../../../charts/ecs_goal_chart';
import { EcsSummaryDonutChart } from '../../../charts/ecs_summary_donut_chart';
import { ALL_TAB_ID } from '../../index_properties/helpers';
import type { PartitionedFieldMetadata } from '../../../types';

interface Props {
  addToNewCaseDisabled: boolean;
  indexName: string;
  onAddToNewCase: (markdownComments: string[]) => void;
  partitionedFieldMetadata: PartitionedFieldMetadata;
  setSelectedTabId: (tabId: string) => void;
  version: string;
}

const SummaryTabComponent: React.FC<Props> = ({
  addToNewCaseDisabled,
  indexName,
  onAddToNewCase,
  partitionedFieldMetadata,
  setSelectedTabId,
  version,
}) => (
  <>
    <CalloutSummary
      addToNewCaseDisabled={addToNewCaseDisabled}
      indexName={indexName}
      onAddToNewCase={onAddToNewCase}
      partitionedFieldMetadata={partitionedFieldMetadata}
      version={version}
    />

    <EuiFlexGroup gutterSize="none" justifyContent="center" wrap={true}>
      <EuiFlexItem grow={false}>
        <EcsSummaryDonutChart
          defaultTabId={ALL_TAB_ID}
          partitionedFieldMetadata={partitionedFieldMetadata}
          setSelectedTabId={setSelectedTabId}
        />
        <EuiSpacer />
      </EuiFlexItem>

      <EuiFlexItem grow={false}>
        <EcsGoalChart
          partitionedFieldMetadata={partitionedFieldMetadata}
          setSelectedTabId={setSelectedTabId}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  </>
);

SummaryTabComponent.displayName = 'SummaryTabComponent';

export const SummaryTab = React.memo(SummaryTabComponent);
