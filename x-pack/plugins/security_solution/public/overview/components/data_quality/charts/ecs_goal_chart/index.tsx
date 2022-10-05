/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexItem, EuiFlexGroup, EuiSpacer, EuiTitle } from '@elastic/eui';
import React from 'react';

import { ChartBody } from './chart_body';
import { EcsCompliantLegend } from './chart_legend/ecs_compliant_legend';
import { NonEcsLegend } from './chart_legend/non_ecs_legend';
import { NotEcsCompliantLegend } from './chart_legend/not_ecs_compliant_legend';
import * as i18n from './translations';
import type { PartitionedFieldMetadata } from '../../types';

export const DEFAULT_HEIGHT = 200; // px

interface Props {
  height?: number;
  partitionedFieldMetadata: PartitionedFieldMetadata;
  setSelectedTabId: (tabId: string) => void;
}

const EcsGoalChartComponent: React.FC<Props> = ({
  height = DEFAULT_HEIGHT,
  partitionedFieldMetadata,
  setSelectedTabId,
}) => (
  <>
    <EuiTitle size="xs">
      <h4 className="eui-textCenter">{i18n.CHART_TITLE}</h4>
    </EuiTitle>

    <EuiSpacer />

    <EuiFlexGroup
      data-test-subj="goalChartContainer"
      gutterSize="none"
      justifyContent="center"
      responsive={false}
    >
      <EuiFlexItem grow={false}>
        <NotEcsCompliantLegend />
      </EuiFlexItem>

      <EuiFlexItem grow={false}>
        <EuiFlexGroup alignItems="center" direction="column" gutterSize="none">
          <EuiFlexItem grow={false}>
            <NonEcsLegend />
          </EuiFlexItem>

          <EuiFlexItem grow={false}>
            <ChartBody
              height={height}
              partitionedFieldMetadata={partitionedFieldMetadata}
              setSelectedTabId={setSelectedTabId}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>

      <EuiFlexItem grow={false}>
        <EcsCompliantLegend />
      </EuiFlexItem>
    </EuiFlexGroup>
  </>
);

EcsGoalChartComponent.displayName = 'EcsGoalChartComponent';

export const EcsGoalChart = React.memo(EcsGoalChartComponent);
