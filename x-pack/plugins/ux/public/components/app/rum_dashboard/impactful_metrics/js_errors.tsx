/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
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
  EuiLink,
} from '@elastic/eui';
import numeral from '@elastic/numeral';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { useLegacyUrlParams } from '../../../../context/url_params_context/use_url_params';
import { useFetcher } from '../../../../hooks/use_fetcher';
import { I18LABELS } from '../translations';
import { CsmSharedContext } from '../csm_shared_context';
import { FETCH_STATUS } from '../../../../../../observability/public';

interface JSErrorItem {
  errorMessage: string;
  errorGroupId: ReactText;
  count: number;
}

export function JSErrors() {
  const { rangeId, urlParams, uxUiFilters } = useLegacyUrlParams();

  const { start, end, serviceName, searchTerm } = urlParams;

  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 5 });

  const { data, status } = useFetcher(
    (callApmApi) => {
      if (start && end && serviceName) {
        return callApmApi('GET /internal/apm/ux/js-errors', {
          params: {
            query: {
              start,
              end,
              urlQuery: searchTerm || undefined,
              uiFilters: JSON.stringify(uxUiFilters),
              pageSize: String(pagination.pageSize),
              pageIndex: String(pagination.pageIndex),
            },
          },
        });
      }
      return Promise.resolve(null);
    },
    // `rangeId` acts as a cache buster for stable ranges like "Today"
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [start, end, serviceName, uxUiFilters, pagination, searchTerm, rangeId]
  );

  const {
    sharedData: { totalPageViews },
  } = useContext(CsmSharedContext);

  const cols = [
    {
      field: 'errorMessage',
      name: I18LABELS.errorMessage,
      render: (errorMessage: string, item: JSErrorItem) => (
        <EuiLink href={`/services/${serviceName}/errors/${item.errorGroupId}`}>
          {errorMessage}
        </EuiLink>
      ),
    },
    {
      name: I18LABELS.impactedPageLoads,
      field: 'count',
      align: 'right' as const,
      render: (count: number) => (
        <FormattedMessage
          id="xpack.ux.jsErrors.percent"
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
            isLoading={status === FETCH_STATUS.LOADING}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      <EuiBasicTable
        data-test-subj={'uxJsErrorTable'}
        loading={status === FETCH_STATUS.LOADING}
        error={
          status === FETCH_STATUS.FAILURE
            ? i18n.translate('xpack.ux.jsErrorsTable.errorMessage', {
                defaultMessage: 'Failed to fetch',
              })
            : ''
        }
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
