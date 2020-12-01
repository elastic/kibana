/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { ReactText, useContext, useState } from 'react';
import {
  EuiBasicTable,
  EuiFlexItem,
  EuiFlexGroup,
  EuiSpacer,
  EuiTitle,
  EuiStat,
  EuiToolTip,
} from '@elastic/eui';
import numeral from '@elastic/numeral';
import { FormattedMessage } from '@kbn/i18n/react';
import { useUrlParams } from '../../../../hooks/useUrlParams';
import { useFetcher } from '../../../../hooks/useFetcher';
import { I18LABELS } from '../translations';
import { CsmSharedContext } from '../CsmSharedContext';
import { ErrorDetailLink } from '../../../shared/Links/apm/ErrorDetailLink';

interface JSErrorItem {
  errorMessage: string;
  errorGroupId: ReactText;
  count: number;
}

export function JSErrors() {
  const { urlParams, uiFilters } = useUrlParams();

  const { start, end, serviceName, searchTerm } = urlParams;

  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 5 });

  const { data, status } = useFetcher(
    (callApmApi) => {
      if (start && end && serviceName) {
        return callApmApi({
          endpoint: 'GET /api/apm/rum-client/js-errors',
          params: {
            query: {
              start,
              end,
              urlQuery: searchTerm || undefined,
              uiFilters: JSON.stringify(uiFilters),
              pageSize: String(pagination.pageSize),
              pageIndex: String(pagination.pageIndex),
            },
          },
        });
      }
      return Promise.resolve(null);
    },
    [start, end, serviceName, uiFilters, pagination, searchTerm]
  );

  const {
    sharedData: { totalPageViews },
  } = useContext(CsmSharedContext);

  const cols = [
    {
      field: 'errorMessage',
      name: I18LABELS.errorMessage,
      render: (errorMessage: string, item: JSErrorItem) => (
        <ErrorDetailLink
          serviceName={serviceName!}
          errorGroupId={item.errorGroupId as string}
        >
          {errorMessage}
        </ErrorDetailLink>
      ),
    },
    {
      name: I18LABELS.impactedPageLoads,
      field: 'count',
      align: 'right' as const,
      render: (count: number) => (
        <FormattedMessage
          id="xpack.apm.ux.jsErrors.percent"
          defaultMessage="{pageLoadPercent} %"
          values={{
            pageLoadPercent: ((count / totalPageViews) * 100).toFixed(1),
          }}
        />
      ),
    },
  ];

  const onTableChange = ({
    page,
  }: {
    page: { size: number; index: number };
  }) => {
    setPagination({
      pageIndex: page.index,
      pageSize: page.size,
    });
  };

  const totalErrors = data?.totalErrors ?? 0;

  return (
    <>
      <EuiTitle size="xs">
        <h3>{I18LABELS.jsErrors}</h3>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiFlexGroup>
        <EuiFlexItem grow={false}>
          <EuiStat
            data-test-subj={'uxJsErrorsTotal'}
            titleSize="s"
            title={
              totalErrors < 1000 ? (
                totalErrors
              ) : (
                <EuiToolTip content={totalErrors}>
                  <>{numeral(totalErrors).format('0 a')}</>
                </EuiToolTip>
              )
            }
            description={I18LABELS.totalErrors}
            isLoading={status !== 'success'}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      <EuiBasicTable
        data-test-subj={'uxJsErrorTable'}
        loading={status !== 'success'}
        responsive={false}
        compressed={true}
        columns={cols}
        items={data?.items ?? []}
        onChange={onTableChange}
        pagination={{
          ...pagination,
          totalItemCount: data?.totalErrorGroups ?? 0,
        }}
      />
    </>
  );
}
