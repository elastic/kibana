/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useState } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiAccordion,
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiTablePagination,
  EuiText,
  EuiTextColor,
  EuiTitle,
} from '@elastic/eui';
import { useFetchSloList } from '../../../../hooks/slo/use_fetch_slo_list';
import { SlosView } from '../slos_view';
import type { SortDirection } from '../slo_list_search_bar';
import { SLI_OPTIONS } from '../../../slo_edit/constants';
import { useSloFormattedSLIValue } from '../../hooks/use_slo_summary';

interface Props {
  isCompact: boolean;
  group: string;
  kqlQuery: string;
  sloView: string;
  sort: string;
  direction: SortDirection;
  groupBy: string;
  summary: {
    worst: {
      sliValue: number;
      status: string;
    };
    total: number;
    violated: number;
  };
}

export function GroupListView({
  isCompact,
  group,
  kqlQuery,
  sloView,
  sort,
  direction,
  groupBy,
  summary,
}: Props) {
  const query = kqlQuery ? `"${groupBy}": ${group} and ${kqlQuery}` : `"${groupBy}": ${group}`;
  let groupName = group.toLowerCase();
  if (groupBy === 'slo.indicator.type') {
    groupName = SLI_OPTIONS.find((option) => option.value === group)?.text ?? group;
  }

  const [page, setPage] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const {
    isLoading,
    isRefetching,
    isError,
    data: sloList,
  } = useFetchSloList({
    kqlQuery: query,
    sortBy: sort,
    sortDirection: direction,
    perPage: itemsPerPage,
    page: page + 1,
  });
  const { results = [], total = 0 } = sloList ?? {};

  const handlePageClick = (pageNumber: number) => {
    setPage(pageNumber);
  };

  const getTotalViolated = () => {
    if (isNullOrUndefined(summary.violated) || isNullOrUndefined(summary.total)) {
      return null;
    }
    if (summary.violated === 0) {
      return i18n.translate('xpack.observability.slo.group.totalHealthy', {
        defaultMessage: '{total} Healthy',
        values: {
          total: `${summary.total}/${summary.total}`,
        },
      });
    } else {
      return i18n.translate('xpack.observability.slo.group.totalViolated', {
        defaultMessage: '{total} Violated',
        values: {
          total: `${summary.violated}/${summary.total}`,
        },
      });
    }
  };

  const worstSLI = useSloFormattedSLIValue(summary.worst.sliValue);
  const totalViolated = getTotalViolated();

  return (
    <EuiPanel hasBorder={true}>
      <EuiFlexGroup>
        <EuiFlexItem>
          <MemoEuiAccordion
            buttonContent={
              <EuiFlexGroup alignItems="center" responsive={false}>
                <EuiFlexItem>
                  <EuiTitle size="xs">
                    <h3>{groupName}</h3>
                  </EuiTitle>
                </EuiFlexItem>
                {totalViolated && (
                  <EuiFlexItem grow={false}>
                    <EuiBadge color={summary.violated > 0 ? 'danger' : 'success'}>
                      {totalViolated}
                    </EuiBadge>
                  </EuiFlexItem>
                )}
                <EuiText size="s">
                  {i18n.translate('xpack.observability.slo.group.worstPerforming', {
                    defaultMessage: 'Worst performing',
                  })}
                  {': '}
                  <EuiTextColor color={summary.worst.status !== 'HEALTHY' ? 'danger' : undefined}>
                    <strong>{worstSLI}</strong>
                  </EuiTextColor>
                </EuiText>
              </EuiFlexGroup>
            }
            id={group}
            initialIsOpen={false}
          >
            <>
              <EuiSpacer size="m" />
              <SlosView
                sloList={results}
                loading={isLoading || isRefetching}
                error={isError}
                isCompact={isCompact}
                sloView={sloView}
                group={group}
              />
              <EuiSpacer size="m" />
              <EuiTablePagination
                pageCount={Math.ceil(total / itemsPerPage)}
                activePage={page}
                onChangePage={handlePageClick}
                itemsPerPage={itemsPerPage}
                onChangeItemsPerPage={(perPage) => setItemsPerPage(perPage)}
              />
            </>
          </MemoEuiAccordion>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
}

const MemoEuiAccordion = memo(EuiAccordion);

function isNullOrUndefined(value: any) {
  return value === undefined || value === null;
}
