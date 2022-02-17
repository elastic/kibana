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
import { CloudPostureStats, ResourceType } from '../../../../common/types';
import { allNavigationItems } from '../../../common/navigation/constants';
import { encodeQuery } from '../../../common/navigation/query_utils';
import { getFormattedNum } from '../../../common/utils/get_formatted_num';
import * as TEXT from '../translations';
import { INTERNAL_FEATURE_FLAGS, RULE_FAILED } from '../../../../common/constants';

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
  data: CloudPostureStats['resourcesTypes'];
}

const maxRisks = 5;

export const getTop5Risks = (resourcesTypes: CloudPostureStats['resourcesTypes']) => {
  const filtered = resourcesTypes.filter((x) => x.totalFailed > 0);
  const sorted = filtered.slice().sort((first, second) => second.totalFailed - first.totalFailed);

  return sorted.slice(0, maxRisks);
};

const getFailedFindingsQuery = (): Query => ({
  language: 'kuery',
  query: `result.evaluation : "${RULE_FAILED}" `,
});

const getResourceTypeFailedFindingsQuery = (resourceTypeName: string): Query => ({
  language: 'kuery',
  query: `resource.type : "${resourceTypeName}" and result.evaluation : "${RULE_FAILED}" `,
});

export const RisksTable = ({ data: resourcesTypes }: RisksTableProps) => {
  const { push } = useHistory();

  const handleCellClick = useCallback(
    (resourceTypeName: ResourceType['name']) =>
      push({
        pathname: allNavigationItems.findings.path,
        search: encodeQuery(getResourceTypeFailedFindingsQuery(resourceTypeName)),
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
        field: 'name',
        name: TEXT.RESOURCE_TYPE,
        render: (resourceTypeName: ResourceType['name']) => (
          <EuiLink onClick={() => handleCellClick(resourceTypeName)}>{resourceTypeName}</EuiLink>
        ),
      },
      {
        field: 'totalFailed',
        name: TEXT.FINDINGS,
        render: (totalFailed: ResourceType['totalFailed'], resource: ResourceType) => (
          <>
            <EuiText size="s" color="danger">{`${getFormattedNum(resource.totalFailed)}`}</EuiText>
            <EuiText size="s">{`/${getFormattedNum(resource.totalFindings)}`}</EuiText>
          </>
        ),
      },
    ],
    [handleCellClick]
  );

  const items = useMemo(() => getTop5Risks(resourcesTypes), [resourcesTypes]);

  return (
    <EuiFlexGroup direction="column" justifyContent="spaceBetween" gutterSize="s">
      <EuiFlexItem>
        <EuiBasicTable<ResourceType>
          rowHeader="name"
          items={INTERNAL_FEATURE_FLAGS.showRisksMock ? getTop5Risks(mockData) : items}
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
