/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { CalloutSummary } from './callout_summary';
import { EcsSummaryDonutChart } from '../../../charts/ecs_summary_donut_chart';
import { ALL_TAB_ID } from '../../index_properties/helpers';
import type { PartitionedFieldMetadata } from '../../../types';

interface Props {
  addToNewCaseDisabled: boolean;
  docsCount: number;
  indexName: string;
  onAddToNewCase: (markdownComments: string[]) => void;
  partitionedFieldMetadata: PartitionedFieldMetadata;
  setSelectedTabId: (tabId: string) => void;
  version: string;
}

const SummaryTabComponent: React.FC<Props> = ({
  addToNewCaseDisabled,
  docsCount,
  indexName,
  onAddToNewCase,
  partitionedFieldMetadata,
  setSelectedTabId,
  version,
}) => (
  <>
    <CalloutSummary
      addToNewCaseDisabled={addToNewCaseDisabled}
      docsCount={docsCount}
      indexName={indexName}
      onAddToNewCase={onAddToNewCase}
      partitionedFieldMetadata={partitionedFieldMetadata}
      version={version}
    />

    <EcsSummaryDonutChart
      defaultTabId={ALL_TAB_ID}
      partitionedFieldMetadata={partitionedFieldMetadata}
      setSelectedTabId={setSelectedTabId}
    />
  </>
);

SummaryTabComponent.displayName = 'SummaryTabComponent';

export const SummaryTab = React.memo(SummaryTabComponent);
