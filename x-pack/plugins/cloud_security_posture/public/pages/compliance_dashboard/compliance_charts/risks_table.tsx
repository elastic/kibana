/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  EuiBasicTable,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiText,
} from '@elastic/eui';
import { ComplianceDashboardData, ResourceType } from '../../../../common/types';
import { CompactFormattedNumber } from '../../../components/compact_formatted_number';
import * as TEXT from '../translations';
import { INTERNAL_FEATURE_FLAGS } from '../../../../common/constants';

const mockData = [
  {
    name: 'pods',
    totalFindings: 2,
    totalPassed: 1,
    totalFailed: 1,
  },
  {
    name: 'etcd',
    totalFindings: 5,
    totalPassed: 0,
    totalFailed: 5,
  },
  {
    name: 'cluster',
    totalFindings: 2,
    totalPassed: 2,
    totalFailed: 0,
  },
  {
    name: 'system',
    totalFindings: 10,
    totalPassed: 6,
    totalFailed: 4,
  },
  {
    name: 'api',
    totalFindings: 19100,
    totalPassed: 2100,
    totalFailed: 17000,
  },
  {
    name: 'server',
    totalFindings: 7,
    totalPassed: 4,
    totalFailed: 3,
  },
];

export interface RisksTableProps {
  data: ComplianceDashboardData['resourcesTypes'];
  maxItems: number;
  onCellClick: (resourceTypeName: string) => void;
  onViewAllClick: () => void;
}

export const getTopRisks = (
  resourcesTypes: ComplianceDashboardData['resourcesTypes'],
  maxItems: number
) => {
  const filtered = resourcesTypes.filter((x) => x.totalFailed > 0);
  const sorted = filtered.slice().sort((first, second) => second.totalFailed - first.totalFailed);

  return sorted.slice(0, maxItems);
};

export const RisksTable = ({
  data: resourcesTypes,
  maxItems,
  onCellClick,
  onViewAllClick,
}: RisksTableProps) => {
  const columns = useMemo(
    () => [
      {
        field: 'name',
        name: TEXT.RESOURCE_TYPE,
        render: (resourceTypeName: ResourceType['name']) => (
          <EuiLink onClick={() => onCellClick(resourceTypeName)}>{resourceTypeName}</EuiLink>
        ),
      },
      {
        field: 'totalFailed',
        name: TEXT.FINDINGS,
        render: (totalFailed: ResourceType['totalFailed'], resource: ResourceType) => (
          <>
            <EuiText size="s" color="danger">
              <CompactFormattedNumber number={resource.totalFailed} />
            </EuiText>
            <EuiText size="s">
              {'/'}
              <CompactFormattedNumber number={resource.totalFindings} />
            </EuiText>
          </>
        ),
      },
    ],
    [onCellClick]
  );

  const items = useMemo(() => getTopRisks(resourcesTypes, maxItems), [resourcesTypes, maxItems]);

  return (
    <EuiFlexGroup direction="column" justifyContent="spaceBetween" gutterSize="s">
      <EuiFlexItem>
        <EuiBasicTable<ResourceType>
          rowHeader="name"
          items={INTERNAL_FEATURE_FLAGS.showRisksMock ? getTopRisks(mockData, maxItems) : items}
          columns={columns}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiFlexGroup justifyContent="center" gutterSize="none">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={onViewAllClick} iconType="search">
              {TEXT.VIEW_ALL_FAILED_FINDINGS}
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
