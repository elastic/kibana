/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useCallback, useRef, useState } from 'react';
import classnames from 'classnames';
import {
  EuiAvatar,
  EuiBadgeGroup,
  EuiBadge,
  EuiBasicTable,
  EuiEmptyPrompt,
  EuiTableActionsColumnType,
  EuiTableComputedColumnType,
  EuiTableFieldDataColumnType,
  EuiTableSortingType,
} from '@elastic/eui';
import { EuiTableSelectionType } from '@elastic/eui/src/components/basic_table/table_types';
import { isEmpty, memoize } from 'lodash/fp';
import styled from 'styled-components';
import { CaseStatuses, CaseType } from '../../../../../cases/common/api';
import { getEmptyTagValue } from '../../../common/components/empty_value';
import { Case, DeleteCase, SubCase, SortFieldCase } from '../../containers/types';
import { getCreateCaseUrl, useFormatUrl } from '../../../common/components/link_to';
import { useGetCases, UpdateCase } from '../../containers/use_get_cases';
import { useGetCasesStatus } from '../../containers/use_get_cases_status';
import { EuiBasicTableOnChange } from '../../../detections/pages/detection_engine/rules/types';
import { CaseDetailsLink, LinkButton } from '../../../common/components/links';
import { SecurityPageName } from '../../../app/types';
import { useKibana } from '../../../common/lib/kibana';
import { APP_ID } from '../../../../common/constants';
import { SELECTABLE_MESSAGE_COLLECTIONS } from '../../translations';
import * as i18n from './translations';
import { Status } from '../status';
import { getSubCasesStatusCountsBadges, isSubCase } from './helpers';

export type CasesColumns =
  | EuiTableFieldDataColumnType<Case>
  | EuiTableComputedColumnType<Case>
  | EuiTableActionsColumnType<Case>;

const MediumShadeText = styled.p`
  color: ${({ theme }) => theme.eui.euiColorMediumShade};
`;

const Spacer = styled.span`
  margin-left: ${({ theme }) => theme.eui.paddingSizes.s};
`;

const TagWrapper = styled(EuiBadgeGroup)`
  width: 100%;
`;

export const getCompactCasesColumns = (): CasesColumns[] => {
  const columns = [
    {
      name: i18n.NAME,
      render: (theCase: Case | SubCase) => {
        if (theCase.id != null && theCase.title != null) {
          const caseDetailsLinkComponent = (
            <CaseDetailsLink
              detailName={isSubCase(theCase) ? theCase.caseParentId : theCase.id}
              title={theCase.title}
              subCaseId={isSubCase(theCase) ? theCase.id : undefined}
            >
              {theCase.title}
            </CaseDetailsLink>
          );
          return theCase.status !== CaseStatuses.closed ? (
            caseDetailsLinkComponent
          ) : (
            <>
              {caseDetailsLinkComponent}
              <Spacer>
                <MediumShadeText>{i18n.CLOSED}</MediumShadeText>
              </Spacer>
            </>
          );
        }
        return getEmptyTagValue();
      },
    },
    {
      field: 'createdBy',
      name: i18n.REPORTER,
      render: (createdBy: Case['createdBy']) => {
        if (createdBy != null) {
          return (
            <>
              <EuiAvatar
                className="userAction__circle"
                name={createdBy.fullName ? createdBy.fullName : createdBy.username ?? i18n.UNKNOWN}
                size="s"
              />
              <Spacer data-test-subj="case-table-column-createdBy">
                {createdBy.fullName ? createdBy.fullName : createdBy.username ?? i18n.UNKNOWN}
              </Spacer>
            </>
          );
        }
        return getEmptyTagValue();
      },
    },
    {
      field: 'tags',
      name: i18n.TAGS,
      render: (tags: Case['tags']) => {
        if (tags != null && tags.length > 0) {
          return (
            <TagWrapper>
              {tags.map((tag: string, i: number) => (
                <EuiBadge
                  color="hollow"
                  key={`${tag}-${i}`}
                  data-test-subj={`case-table-column-tags-${i}`}
                >
                  {tag}
                </EuiBadge>
              ))}
            </TagWrapper>
          );
        }
        return getEmptyTagValue();
      },
      truncateText: true,
    },
    {
      name: i18n.STATUS,
      render: (theCase: Case) => {
        if (theCase?.subCases == null || theCase.subCases.length === 0) {
          if (theCase.status == null || theCase.type === CaseType.collection) {
            return getEmptyTagValue();
          }
          return <Status type={theCase.status} />;
        }

        const badges = getSubCasesStatusCountsBadges(theCase.subCases);
        return badges.map(({ color, count }, index) => (
          <EuiBadge key={index} color={color}>
            {count}
          </EuiBadge>
        ));
      },
    },
  ];
  return columns;
};

export const CompactCasesTable = React.memo(({ userCanCrud }: { userCanCrud: boolean }) => {
  const [deleteBulk, setDeleteBulk] = useState<DeleteCase[]>([]);
  const { fetchCasesStatus } = useGetCasesStatus();
  const { data, queryParams, refetchCases, setQueryParams, setSelectedCases } = useGetCases();
  const { navigateToApp } = useKibana().services.application;
  const { formatUrl, search: urlSearch } = useFormatUrl(SecurityPageName.case);
  const enableBulkActions = userCanCrud;

  const memoizedPagination = useMemo(
    () => ({
      pageIndex: queryParams.page - 1,
      pageSize: queryParams.perPage,
      totalItemCount: data.total,
      pageSizeOptions: [5, 10, 15, 20, 25],
    }),
    [data, queryParams]
  );

  const memoizedGetCasesColumns = useMemo(() => getCompactCasesColumns(), []);

  const getSortField = (field: string): SortFieldCase => {
    if (field === SortFieldCase.createdAt) {
      return SortFieldCase.createdAt;
    } else if (field === SortFieldCase.closedAt) {
      return SortFieldCase.closedAt;
    }
    return SortFieldCase.createdAt;
  };

  const sorting: EuiTableSortingType<Case> = {
    sort: { field: queryParams.sortField, direction: queryParams.sortOrder },
  };

  const goToCreateCase = useCallback(
    (ev) => {
      ev.preventDefault();
      navigateToApp(`${APP_ID}:${SecurityPageName.case}`, {
        path: getCreateCaseUrl(urlSearch),
      });
    },
    [navigateToApp, urlSearch]
  );

  const filterRefetch = useRef<() => void>();
  const setFilterRefetch = useCallback(
    (refetchFilter: () => void) => {
      filterRefetch.current = refetchFilter;
    },
    [filterRefetch]
  );

  const refreshCases = useCallback(
    (dataRefresh = true) => {
      if (dataRefresh) refetchCases();
      fetchCasesStatus();
      setSelectedCases([]);
      setDeleteBulk([]);
      if (filterRefetch.current != null) {
        filterRefetch.current();
      }
    },
    [filterRefetch, refetchCases, setSelectedCases, fetchCasesStatus]
  );

  const euiBasicTableSelectionProps = useMemo<EuiTableSelectionType<Case>>(
    () => ({
      onSelectionChange: setSelectedCases,
      selectableMessage: (selectable) => (!selectable ? SELECTABLE_MESSAGE_COLLECTIONS : ''),
    }),
    [setSelectedCases]
  );

  const tableOnChangeCallback = useCallback(
    ({ page, sort }: EuiBasicTableOnChange) => {
      let newQueryParams = queryParams;
      if (sort) {
        newQueryParams = {
          ...newQueryParams,
          sortField: getSortField(sort.field),
          sortOrder: sort.direction,
        };
      }
      if (page) {
        newQueryParams = {
          ...newQueryParams,
          page: page.index + 1,
          perPage: page.size,
        };
      }
      setQueryParams(newQueryParams);
      refreshCases(false);
    },
    [queryParams, refreshCases, setQueryParams]
  );

  const tableRowProps = useCallback((theCase: Case) => {
    return {
      'data-test-subj': `cases-table-row-${theCase.id}`,
      className: classnames({ isDisabled: theCase.type === CaseType.collection }),
    };
  }, []);

  return (
    <EuiBasicTable
      columns={memoizedGetCasesColumns}
      data-test-subj="compact-cases-table"
      isSelectable={enableBulkActions}
      itemId="id"
      items={data.cases}
      noItemsMessage={
        <EuiEmptyPrompt
          title={<h3>{i18n.NO_CASES}</h3>}
          titleSize="xs"
          body={i18n.NO_CASES_BODY}
          actions={
            <LinkButton
              isDisabled={!userCanCrud}
              fill
              size="s"
              onClick={goToCreateCase}
              href={formatUrl(getCreateCaseUrl())}
              iconType="plusInCircle"
              data-test-subj="cases-table-add-case"
            >
              {i18n.ADD_NEW_CASE}
            </LinkButton>
          }
        />
      }
      onChange={tableOnChangeCallback}
      pagination={memoizedPagination}
      rowProps={tableRowProps}
      selection={enableBulkActions ? euiBasicTableSelectionProps : undefined}
      sorting={sorting}
      className="compactCasesTable"
    />
  );
});

CompactCasesTable.displayName = 'CompactCasesTable';
