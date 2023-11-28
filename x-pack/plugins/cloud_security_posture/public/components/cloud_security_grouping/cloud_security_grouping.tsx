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
}: CloudSecurityGroupingProps) => {
  return (
    <div
      data-test-subj="cloudSecurityGrouping"
      css={css`
        && .euiAccordion__optionalAction {
          display: none;
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
