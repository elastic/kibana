/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useGrouping } from '@kbn/securitysolution-grouping';
import { ParsedGroupingAggregation } from '@kbn/securitysolution-grouping/src';
import { Filter } from '@kbn/es-query';
import React from 'react';
import { css } from '@emotion/react';
import { CSP_GROUPING, CSP_GROUPING_LOADING } from '../test_subjects';

interface CloudSecurityGroupingProps {
  data: ParsedGroupingAggregation<any>;
  renderChildComponent: (groupFilter: Filter[]) => JSX.Element;
  grouping: ReturnType<typeof useGrouping>;
  activePageIndex: number;
  isFetching: boolean;
  pageSize: number;
  onChangeGroupsItemsPerPage: (size: number) => void;
  onChangeGroupsPage: (index: number) => void;
  selectedGroup: string;
  isGroupLoading?: boolean;
}

/**
 * This component is used to render the loading state of the CloudSecurityGrouping component
 * It's used to avoid the flickering of the table when the data is loading
 */
const CloudSecurityGroupingLoading = ({
  grouping,
  pageSize,
}: Pick<CloudSecurityGroupingProps, 'grouping' | 'pageSize'>) => {
  return (
    <div data-test-subj={CSP_GROUPING_LOADING}>
      {grouping.getGrouping({
        activePage: 0,
        data: {
          groupsCount: { value: 1 },
          unitsCount: { value: 1 },
        },
        groupingLevel: 0,
        inspectButton: undefined,
        isLoading: true,
        itemsPerPage: pageSize,
        renderChildComponent: () => <></>,
        onGroupClose: () => {},
        selectedGroup: '',
        takeActionItems: () => [],
      })}
    </div>
  );
};

export const CloudSecurityGrouping = ({
  data,
  renderChildComponent,
  grouping,
  activePageIndex,
  isFetching,
  pageSize,
  onChangeGroupsItemsPerPage,
  onChangeGroupsPage,
  selectedGroup,
  isGroupLoading,
}: CloudSecurityGroupingProps) => {
  if (isGroupLoading) {
    return <CloudSecurityGroupingLoading grouping={grouping} pageSize={pageSize} />;
  }
  return (
    <div
      data-test-subj={CSP_GROUPING}
      css={css`
        && [data-test-subj='group-stats'] > .euiFlexItem:last-child {
          display: none;
        }
        && [data-test-subj='group-stats'] > .euiFlexItem:not(:first-child) > span {
          border-right: none;
          margin-right: 0;
        }
      `}
    >
      {grouping.getGrouping({
        activePage: activePageIndex,
        data,
        groupingLevel: 0,
        inspectButton: undefined,
        isLoading: isFetching,
        itemsPerPage: pageSize,
        onChangeGroupsItemsPerPage,
        onChangeGroupsPage,
        renderChildComponent,
        onGroupClose: () => {},
        selectedGroup,
        takeActionItems: () => [],
      })}
    </div>
  );
};
