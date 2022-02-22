/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import {
  EuiBasicTable,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiText,
} from '@elastic/eui';
import type { Query } from '@kbn/es-query';
import { useHistory } from 'react-router-dom';
import { CloudPostureStats, ResourceTypeAgg } from '../../../../common/types';
import { allNavigationItems } from '../../../common/navigation/constants';
import { encodeQuery } from '../../../common/navigation/query_utils';
import { CompactFormattedNumber } from '../../../components/compact_formatted_number';
import * as TEXT from '../translations';
import { RULE_FAILED } from '../../../../common/constants';

// TODO: remove this option after we get data from the beat
const useMockData: boolean = false;
const mock = [
  {
    resourceType: 'pods',
    totalFindings: 2,
    totalPassed: 1,
    totalFailed: 1,
  },
  {
    resourceType: 'etcd',
    totalFindings: 5,
    totalPassed: 0,
    totalFailed: 5,
  },
  {
    resourceType: 'cluster',
    totalFindings: 2,
    totalPassed: 2,
    totalFailed: 0,
  },
  {
    resourceType: 'system',
    totalFindings: 10,
    totalPassed: 6,
    totalFailed: 4,
  },
  {
    resourceType: 'api',
    totalFindings: 19100,
    totalPassed: 2100,
    totalFailed: 17000,
  },
  {
    resourceType: 'server',
    totalFindings: 7,
    totalPassed: 4,
    totalFailed: 3,
  },
];

export interface RisksTableProps {
  data: CloudPostureStats['resourceTypesAggs'];
}

const maxRisks = 5;

export const getTop5Risks = (resourceTypesAggs: CloudPostureStats['resourceTypesAggs']) => {
  const filtered = resourceTypesAggs.filter((x) => x.totalFailed > 0);
  const sorted = filtered.slice().sort((first, second) => second.totalFailed - first.totalFailed);

  return sorted.slice(0, maxRisks);
};

const getFailedFindingsQuery = (): Query => ({
  language: 'kuery',
  query: `result.evaluation : "${RULE_FAILED}" `,
});

const getResourceTypeFailedFindingsQuery = (resourceType: string): Query => ({
  language: 'kuery',
  query: `resource.type : "${resourceType}" and result.evaluation : "${RULE_FAILED}" `,
});

export const RisksTable = ({ data: resourceTypesAggs }: RisksTableProps) => {
  const { push } = useHistory();

  const handleCellClick = useCallback(
    (resourceType: ResourceTypeAgg['resourceType']) =>
      push({
        pathname: allNavigationItems.findings.path,
        search: encodeQuery(getResourceTypeFailedFindingsQuery(resourceType)),
      }),
    [push]
  );

  const handleViewAllClick = useCallback(
    () =>
      push({
        pathname: allNavigationItems.findings.path,
        search: encodeQuery(getFailedFindingsQuery()),
      }),
    [push]
  );

  const columns = useMemo(
    () => [
      {
        field: 'resourceType',
        name: TEXT.RESOURCE_TYPE,
        render: (resourceType: ResourceTypeAgg['resourceType']) => (
          <EuiLink onClick={() => handleCellClick(resourceType)}>{resourceType}</EuiLink>
        ),
      },
      {
        field: 'totalFailed',
        name: TEXT.FAILED_FINDINGS,
        render: (totalFailed: ResourceTypeAgg['totalFailed'], resource: ResourceTypeAgg) => (
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
    [handleCellClick]
  );

  return (
    <EuiFlexGroup direction="column" justifyContent="spaceBetween" gutterSize="s">
      <EuiFlexItem>
        <EuiBasicTable<ResourceTypeAgg>
          rowHeader="resourceType"
          items={useMockData ? getTop5Risks(mock) : getTop5Risks(resourceTypesAggs)}
          columns={columns}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiFlexGroup justifyContent="center" gutterSize="none">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={handleViewAllClick} iconType="search">
              {TEXT.VIEW_ALL_FAILED_FINDINGS}
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
