/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React, { useCallback } from 'react';
import styled from 'styled-components';

import { ChartLegendItem } from './chart_legend_item';
import { getEcsCompliantColor } from '../../../data_quality_panel/tabs/ecs_compliant_tab/helpers';
import {
  ECS_COMPLIANT_TAB_ID,
  NON_ECS_TAB_ID,
  NOT_ECS_COMPLIANT_TAB_ID,
} from '../../../data_quality_panel/index_properties/helpers';
import { getNonEcsColor } from '../../../data_quality_panel/tabs/non_ecs_tab/helpers';
import { getNotEcsCompliantColor } from '../../../data_quality_panel/tabs/not_ecs_compliant_tab/helpers';
import type { PartitionedFieldMetadata } from '../../../types';
import * as i18n from '../../../data_quality_panel/index_properties/translations';

const ChartLegendFlexGroup = styled(EuiFlexGroup)`
  width: 210px;
`;

interface Props {
  partitionedFieldMetadata: PartitionedFieldMetadata;
  setSelectedTabId: (tabId: string) => void;
}

const ChartLegendComponent: React.FC<Props> = ({ partitionedFieldMetadata, setSelectedTabId }) => {
  const showNotEcsCompliantTab = useCallback(
    () => setSelectedTabId(NOT_ECS_COMPLIANT_TAB_ID),
    [setSelectedTabId]
  );

  const showNonEcsTab = useCallback(() => setSelectedTabId(NON_ECS_TAB_ID), [setSelectedTabId]);

  const showEcsCompliantTab = useCallback(
    () => setSelectedTabId(ECS_COMPLIANT_TAB_ID),
    [setSelectedTabId]
  );

  return (
    <ChartLegendFlexGroup direction="column" gutterSize="none">
      {partitionedFieldMetadata.notEcsCompliant.length > 0 && (
        <EuiFlexItem grow={false}>
          <ChartLegendItem
            color={getNotEcsCompliantColor(partitionedFieldMetadata)}
            count={partitionedFieldMetadata.notEcsCompliant.length}
            onClick={showNotEcsCompliantTab}
            text={i18n.NOT_ECS_COMPLIANT}
          />
        </EuiFlexItem>
      )}

      {partitionedFieldMetadata.nonEcs.length > 0 && (
        <EuiFlexItem grow={false}>
          <ChartLegendItem
            color={getNonEcsColor(partitionedFieldMetadata)}
            count={partitionedFieldMetadata.nonEcs.length}
            onClick={showNonEcsTab}
            text={i18n.NON_ECS}
          />
        </EuiFlexItem>
      )}

      {partitionedFieldMetadata.ecsCompliant.length > 0 && (
        <EuiFlexItem grow={false}>
          <ChartLegendItem
            color={getEcsCompliantColor(partitionedFieldMetadata)}
            count={partitionedFieldMetadata.ecsCompliant.length}
            onClick={showEcsCompliantTab}
            text={i18n.ECS_COMPLIANT}
          />
        </EuiFlexItem>
      )}
    </ChartLegendFlexGroup>
  );
};

ChartLegendComponent.displayName = 'ChartLegendComponent';

export const ChartLegend = React.memo(ChartLegendComponent);
