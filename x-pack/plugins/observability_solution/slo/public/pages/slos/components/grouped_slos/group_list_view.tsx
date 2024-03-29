/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiAccordion,
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiHorizontalRule,
  EuiSpacer,
  EuiTablePagination,
  EuiText,
  EuiTextColor,
  EuiTitle,
  EuiToolTip,
} from '@elastic/eui';
import { Filter } from '@kbn/es-query';
import { i18n } from '@kbn/i18n';
import React, { memo, useState } from 'react';
import { GroupSummary } from '@kbn/slo-schema';
import { CoreStart } from '@kbn/core-lifecycle-browser';
import { useKibana } from '../../../../utils/kibana_react';
import { paths } from '../../../../../common/locators/paths';
import { useFetchSloList } from '../../../../hooks/use_fetch_slo_list';
import { SLI_OPTIONS } from '../../../slo_edit/constants';
import { useSloFormattedSLIValue } from '../../hooks/use_slo_summary';
import { SlosView } from '../slos_view';
import type { SortDirection } from '../slo_list_search_bar';
import { SLOView } from '../toggle_slo_view';

interface Props {
  group: string;
  kqlQuery?: string;
  sloView: SLOView;
  sort?: string;
  direction?: SortDirection;
  groupBy: string;
  summary?: GroupSummary;
  filters?: Filter[];
}

export function GroupListView({
  group,
  kqlQuery,
  sloView,
  sort,
  direction,
  groupBy,
  summary,
  filters,
}: Props) {
  const query = kqlQuery ? `"${groupBy}": (${group}) and ${kqlQuery}` : `"${groupBy}": ${group}`;
  let groupName = group.toLowerCase();
  if (groupBy === 'slo.indicator.type') {
    groupName = SLI_OPTIONS.find((option) => option.value === group)?.text ?? group;
  }

  const [page, setPage] = useState(0);
  const [accordionState, setAccordionState] = useState<'open' | 'closed'>('closed');
  const onToggle = (isOpen: boolean) => {
    const newState = isOpen ? 'open' : 'closed';
    setAccordionState(newState);
  };
  const isAccordionOpen = accordionState === 'open';

  const {
    http: { basePath },
  } = useKibana<CoreStart>().services;

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
    filters,
    disabled: !isAccordionOpen,
  });
  const { results = [], total = 0 } = sloList ?? {};

  const handlePageClick = (pageNumber: number) => {
    setPage(pageNumber);
  };

  const worstSLI = useSloFormattedSLIValue(summary?.worst.sliValue);

  return (
    <>
      <EuiFlexGroup data-test-subj="sloGroupViewPanel">
        <EuiFlexItem>
          <MemoEuiAccordion
            forceState={accordionState}
            onToggle={onToggle}
            buttonContent={
              <EuiFlexGroup alignItems="center" responsive={false} gutterSize="xs">
                <EuiFlexItem grow={false}>
                  <EuiTitle size="xs">
                    <h3>{groupName}</h3>
                  </EuiTitle>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiText color="subdued">({summary?.total})</EuiText>
                </EuiFlexItem>
              </EuiFlexGroup>
            }
            extraAction={
              <EuiFlexGroup alignItems="center">
                {summary!.violated > 0 && (
                  <EuiFlexItem grow={false}>
                    <EuiBadge color="danger">
                      {i18n.translate('xpack.slo.group.totalViolated', {
                        defaultMessage: '{total} Violated',
                        values: {
                          total: summary?.violated,
                        },
                      })}
                    </EuiBadge>
                  </EuiFlexItem>
                )}
                <EuiFlexItem grow={false}>
                  <EuiBadge color={'success'}>
                    {i18n.translate('xpack.slo.group.totalHealthy', {
                      defaultMessage: '{total} Healthy',
                      values: {
                        total: summary?.healthy,
                      },
                    })}
                  </EuiBadge>
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiToolTip
                    content={
                      <>
                        <EuiText size="s">
                          {i18n.translate('xpack.slo.group.totalSloViolatedTooltip', {
                            defaultMessage: 'SLO: {name}',
                            values: {
                              name: summary?.worst.slo?.name,
                            },
                          })}
                        </EuiText>
                        <EuiText size="s">
                          {i18n.translate('xpack.slo.group.totalSloViolatedTooltip.instance', {
                            defaultMessage: 'Instance: {instance}',
                            values: {
                              instance: summary?.worst.slo?.instanceId,
                            },
                          })}
                        </EuiText>
                      </>
                    }
                  >
                    <EuiLink
                      data-test-subj="o11yGroupListViewLink"
                      href={basePath.prepend(
                        paths.sloDetails(summary!.worst.slo?.id, summary!.worst.slo?.instanceId)
                      )}
                    >
                      {i18n.translate('xpack.slo.group.worstPerforming', {
                        defaultMessage: 'Worst performing: ',
                      })}
                      <EuiTextColor
                        color={summary?.worst.status !== 'HEALTHY' ? 'danger' : undefined}
                      >
                        <strong>{worstSLI}</strong>
                      </EuiTextColor>
                    </EuiLink>
                  </EuiToolTip>
                </EuiFlexItem>
              </EuiFlexGroup>
            }
            id={group}
            initialIsOpen={false}
          >
            {isAccordionOpen && (
              <>
                <EuiSpacer size="m" />
                <SlosView
                  sloList={results}
                  loading={isLoading || isRefetching}
                  error={isError}
                  sloView={sloView}
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
            )}
          </MemoEuiAccordion>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiHorizontalRule margin="xs" />
    </>
  );
}

const MemoEuiAccordion = memo(EuiAccordion);
