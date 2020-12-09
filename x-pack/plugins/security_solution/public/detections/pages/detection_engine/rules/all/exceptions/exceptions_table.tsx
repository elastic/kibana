/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useMemo, useRef, useState } from 'react';
import {
  EuiBasicTable,
  EuiEmptyPrompt,
  EuiLoadingContent,
  EuiProgress,
  EuiFieldSearch,
} from '@elastic/eui';
import styled from 'styled-components';

import { useKibana } from '../../../../../../../../../../src/plugins/kibana_react/public';
import { useExceptionLists } from '../../../../../../shared_imports';
import { HeaderSection } from '../../../../../../common/components/header_section';
import { Loader } from '../../../../../../common/components/loader';
import { Panel } from '../../../../../../common/components/panel';
import * as i18n from '../../translations';
import { AllRulesUtilityBar } from '../utility_bar';
import { LastUpdatedAt } from '../../../../../../common/components/last_updated';
import { AllExceptionListsColumns, getAllExceptionListsColumns } from './columns';
import { useAllExceptionLists } from './use_all_exception_lists';

// EuiBasicTable give me a hardtime with adding the ref attributes so I went the easy way
// after few hours of fight with typescript !!!! I lost :(
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const MyEuiBasicTable = styled(EuiBasicTable as any)`` as any;

interface ExceptionListsTableProps {
  hasNoPermissions: boolean;
  loading: boolean;
}

export const ExceptionListsTable = React.memo<ExceptionListsTableProps>(
  ({ hasNoPermissions, loading }) => {
    const [initLoading, setInitLoading] = useState(false);
    const [lastUpdated, setLastUpdated] = useState(Date.now());
    const tableRef = useRef<EuiBasicTable>();
    const { services } = useKibana();
    const [loadingExceptions, exceptions, pagination, refreshExceptions] = useExceptionLists({
      http: services.http,
    });
    const [loadingTableInfo, data] = useAllExceptionLists({
      exceptionLists: exceptions ?? [],
    });

    const exceptionsColumns = useMemo((): AllExceptionListsColumns[] => {
      return getAllExceptionListsColumns(
        () => {},
        () => {}
      );
    }, []);

    const emptyPrompt = useMemo(() => {
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
        <Panel loading={loadingExceptions} data-test-subj="allRulesPanel">
          <>
            {loadingExceptions && (
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

            {loadingExceptions && !initLoading && (
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
