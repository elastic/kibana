/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import styled from 'styled-components';
import { EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner } from '@elastic/eui';
import { OverviewPageLink } from './overview_page_link';
import { MonitorSummary } from '../../../../common/runtime_types/monitor';
import { usePagination } from './use_pagination';

interface Props {
  next: string;
  previous: string;
  loading: boolean;
  items: MonitorSummary[];
}
const Wrapper = styled.div`
  margin-top: 12px;
`;

export const ListPagination = ({ items, next, previous, loading: listLoading }: Props) => {
  const { loading, nextData = [], previousData = [] } = usePagination({ items });

  return (
    <Wrapper>
      <EuiFlexGroup responsive={false} alignItems="center">
        {(loading || listLoading) && (
          <EuiFlexItem>
            <EuiLoadingSpinner />
          </EuiFlexItem>
        )}

        <EuiFlexItem grow={false}>
          <OverviewPageLink
            dataTestSubj="xpack.uptime.monitorList.prevButton"
            direction="prev"
            pagination={previousData.length > 0 ? previous : ''}
            loading={loading || listLoading}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <OverviewPageLink
            dataTestSubj="xpack.uptime.monitorList.nextButton"
            direction="next"
            pagination={nextData.length > 0 ? next : ''}
            loading={loading || listLoading}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </Wrapper>
  );
};
