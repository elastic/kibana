/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useMemo, useEffect, useCallback, useState } from 'react';
import {
  EuiBasicTable,
  EuiEmptyPrompt,
  EuiLoadingContent,
  EuiProgress,
  EuiFieldSearch,
} from '@elastic/eui';
import styled from 'styled-components';

import { Pagination } from '../../../../../../lists_plugin_deps';
import { HeaderSection } from '../../../../../../common/components/header_section';
import { Loader } from '../../../../../../common/components/loader';
import { Panel } from '../../../../../../common/components/panel';
import * as i18n from '../../translations';
import { AllRulesUtilityBar } from '../utility_bar';
import { LastUpdatedAt } from '../../../../../../common/components/last_updated';
import { AllExceptionListsColumns, getAllExceptionListsColumns } from './columns';
import { ExceptionListInfo } from './use_all_exception_lists';

// Known lost battle with Eui :(
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const MyEuiBasicTable = styled(EuiBasicTable as any)`` as any;

interface ExceptionListsTableProps {
  hasNoPermissions: boolean;
  loading: boolean;
  loadingExceptions: boolean;
  loadingTableInfo: boolean;
  data: ExceptionListInfo[];
  pagination: Pagination;
  onRefresh: () => void | null;
}

export const ExceptionListsTable = React.memo<ExceptionListsTableProps>(
  ({
    hasNoPermissions,
    loading,
    loadingExceptions,
    loadingTableInfo,
    data,
    pagination,
    onRefresh,
  }) => {
    const [initLoading, setInitLoading] = useState(false);
    const [lastUpdated, setLastUpdated] = useState(Date.now());

    const handleDelete = useCallback((id: string) => () => {}, []);

    const handleExport = useCallback((id: string) => () => {}, []);

    const exceptionsColumns = useMemo((): AllExceptionListsColumns[] => {
      return getAllExceptionListsColumns(handleExport, handleDelete);
    }, [handleExport, handleDelete]);

    const handleRefresh = useCallback((): void => {
      if (onRefresh != null) {
        setLastUpdated(Date.now());
        onRefresh();
      }
    }, [onRefresh]);

    useEffect(() => {
      if (initLoading && !loading && !loadingExceptions && !loadingTableInfo) {
        setInitLoading(false);
      }
    }, [initLoading, loading, loadingExceptions, loadingTableInfo]);

    const emptyPrompt = useMemo((): JSX.Element => {
      return (
        <EuiEmptyPrompt
          title={<h3>{i18n.NO_EXCEPTION_LISTS}</h3>}
          titleSize="xs"
          body={i18n.NO_RULES_BODY}
        />
      );
    }, []);

    return (
      <>
        <Panel loading={loadingTableInfo} data-test-subj="allRulesPanel">
          <>
            {loadingTableInfo && (
              <EuiProgress
                data-test-subj="loadingRulesInfoProgress"
                size="xs"
                position="absolute"
                color="accent"
              />
            )}
            <HeaderSection
              split={false}
              title={i18n.ALL_EXCEPTIONS}
              subtitle={<LastUpdatedAt showUpdating={loading} updatedAt={lastUpdated} />}
            >
              <EuiFieldSearch
                data-test-subj="exceptionsHeaderSearch"
                aria-label={i18n.EXCEPTIONS_LISTS_SEARCH_PLACEHOLDER}
                placeholder={i18n.EXCEPTIONS_LISTS_SEARCH_PLACEHOLDER}
                onSearch={() => {}}
                disabled={initLoading}
                incremental={false}
                fullWidth
              />
            </HeaderSection>

            {loadingTableInfo && !initLoading && (
              <Loader data-test-subj="loadingPanelAllRulesTable" overlay size="xl" />
            )}
            {initLoading && (
              <EuiLoadingContent data-test-subj="initialLoadingPanelAllRulesTable" lines={10} />
            )}
            <AllRulesUtilityBar
              showBulkActions={false}
              userHasNoPermissions={hasNoPermissions}
              paginationTotal={pagination.total ?? 0}
              numberSelectedItems={0}
              onRefresh={handleRefresh}
            />
            <MyEuiBasicTable
              data-test-subj="exceptions-table"
              columns={exceptionsColumns}
              isSelectable={!hasNoPermissions ?? false}
              itemId="id"
              items={data ?? []}
              noItemsMessage={emptyPrompt}
              onChange={() => {}}
              pagination={pagination}
            />
          </>
        </Panel>
      </>
    );
  }
);

ExceptionListsTable.displayName = 'ExceptionListsTable';
