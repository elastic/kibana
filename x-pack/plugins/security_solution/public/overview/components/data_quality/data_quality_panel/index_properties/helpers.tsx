/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBadge } from '@elastic/eui';
import React from 'react';

import { AllTab } from '../tabs/all_tab';
import { EcsCompliantTab } from '../tabs/ecs_compliant_tab';
import { getEcsCompliantColor } from '../tabs/ecs_compliant_tab/helpers';
import { NonEcsTab } from '../tabs/non_ecs_tab';
import { getNonEcsColor } from '../tabs/non_ecs_tab/helpers';
import { NotEcsCompliantTab } from '../tabs/not_ecs_compliant_tab';
import { getNotEcsCompliantColor } from '../tabs/not_ecs_compliant_tab/helpers';
import { SummaryTab } from '../tabs/summary_tab';
import * as i18n from './translations';
import type { PartitionedFieldMetadata } from '../../types';

export const ALL_TAB_ID = 'allTab';
export const ECS_COMPLIANT_TAB_ID = 'ecsCompliantTab';
export const NON_ECS_TAB_ID = 'nonEcsTab';
export const NOT_ECS_COMPLIANT_TAB_ID = 'notEcsCompliantTab';
export const SUMMARY_TAB_ID = 'summaryTab';

export const getTabs = ({
  addToNewCaseDisabled,
  indexName,
  onAddToNewCase,
  partitionedFieldMetadata,
  setSelectedTabId,
  version,
}: {
  addToNewCaseDisabled: boolean;
  indexName: string;
  onAddToNewCase: (markdownComments: string[]) => void;
  partitionedFieldMetadata: PartitionedFieldMetadata;
  setSelectedTabId: (tabId: string) => void;
  version: string;
}) => [
  {
    content: (
      <SummaryTab
        addToNewCaseDisabled={addToNewCaseDisabled}
        indexName={indexName}
        onAddToNewCase={onAddToNewCase}
        partitionedFieldMetadata={partitionedFieldMetadata}
        setSelectedTabId={setSelectedTabId}
        version={version}
      />
    ),
    id: SUMMARY_TAB_ID,
    name: i18n.SUMMARY,
  },
  {
    append: (
      <EuiBadge color={getNotEcsCompliantColor(partitionedFieldMetadata)}>
        {partitionedFieldMetadata.notEcsCompliant.length}
      </EuiBadge>
    ),
    content: (
      <NotEcsCompliantTab
        addToNewCaseDisabled={addToNewCaseDisabled}
        enrichedFieldMetadata={partitionedFieldMetadata.notEcsCompliant}
        indexName={indexName}
        onAddToNewCase={onAddToNewCase}
        version={version}
      />
    ),
    id: NOT_ECS_COMPLIANT_TAB_ID,
    name: i18n.NOT_ECS_COMPLIANT,
  },
  {
    append: (
      <EuiBadge color={getNonEcsColor(partitionedFieldMetadata)}>
        {partitionedFieldMetadata.nonEcs.length}
      </EuiBadge>
    ),
    content: (
      <NonEcsTab
        addToNewCaseDisabled={addToNewCaseDisabled}
        enrichedFieldMetadata={partitionedFieldMetadata.nonEcs}
        indexName={indexName}
        onAddToNewCase={onAddToNewCase}
        version={version}
      />
    ),
    id: 'nonEcsTab',
    name: i18n.NON_ECS,
  },
  {
    append: (
      <EuiBadge color={getEcsCompliantColor(partitionedFieldMetadata)}>
        {partitionedFieldMetadata.ecsCompliant.length}
      </EuiBadge>
    ),
    content: (
      <EcsCompliantTab
        addToNewCaseDisabled={addToNewCaseDisabled}
        enrichedFieldMetadata={partitionedFieldMetadata.ecsCompliant}
        indexName={indexName}
        onAddToNewCase={onAddToNewCase}
        version={version}
      />
    ),
    id: ECS_COMPLIANT_TAB_ID,
    name: i18n.ECS_COMPLIANT,
  },
  {
    append: <EuiBadge>{partitionedFieldMetadata.all.length}</EuiBadge>,
    content: <AllTab enrichedFieldMetadata={partitionedFieldMetadata.all} />,
    id: ALL_TAB_ID,
    name: i18n.ALL,
  },
];
