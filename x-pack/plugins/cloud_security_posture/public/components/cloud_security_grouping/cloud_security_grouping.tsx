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
import { CSP_GROUPING } from '../test_subjects';

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
  groupingLevel?: number;
  groupSelectorComponent?: JSX.Element;
}

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
  groupingLevel = 0,
  groupSelectorComponent,
}: CloudSecurityGroupingProps) => {
  return (
    <div
      data-test-subj={CSP_GROUPING}
      css={css`
        position: relative;
        && [data-test-subj='group-stats'] > .euiFlexItem:last-child {
          display: none;
        }
        && [data-test-subj='group-stats'] > .euiFlexItem:not(:first-child) > span {
          border-right: none;
          margin-right: 0;
        }
      `}
    >
      <div
        css={css`
          position: absolute;
          right: 0;
          top: 16px;
        `}
      >
        {groupSelectorComponent}
      </div>
      <div
        css={css`
          && [data-test-subj='alerts-table-group-selector'] {
            display: none;
          }
        `}
      >
        {grouping.getGrouping({
          activePage: activePageIndex,
          data,
          groupingLevel,
          selectedGroup,
          inspectButton: undefined,
          isLoading: isFetching,
          itemsPerPage: pageSize,
          onChangeGroupsItemsPerPage,
          onChangeGroupsPage,
          renderChildComponent,
          onGroupClose: () => {},
          takeActionItems: () => [],
        })}
      </div>
    </div>
  );
};
