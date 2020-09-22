/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useContext, useState } from 'react';
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
import { i18n } from '@kbn/i18n';
import { useUrlParams } from '../../../../hooks/useUrlParams';
import { useFetcher } from '../../../../hooks/useFetcher';
import { I18LABELS } from '../translations';
import { CsmSharedContext } from '../CsmSharedContext';

export function JSErrors() {
  const { urlParams, uiFilters } = useUrlParams();

  const { start, end, serviceName } = urlParams;

  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 5 });

  const { data, status } = useFetcher(
    (callApmApi) => {
      if (start && end && serviceName) {
        return callApmApi({
          pathname: '/api/apm/rum-client/js-errors',
          params: {
            query: {
              start,
              end,
              uiFilters: JSON.stringify(uiFilters),
              pageSize: String(pagination.pageSize),
              pageIndex: String(pagination.pageIndex),
            },
          },
        });
      }
      return Promise.resolve(null);
    },
    [start, end, serviceName, uiFilters, pagination]
  );

  const {
    sharedData: { totalPageViews },
  } = useContext(CsmSharedContext);

  const items = (data?.items ?? []).map(({ errorMessage, count }) => ({
    errorMessage,
    percent: i18n.translate('xpack.apm.rum.jsErrors.percent', {
      defaultMessage: '{pageLoadPercent} %',
      values: { pageLoadPercent: ((count / totalPageViews) * 100).toFixed(1) },
    }),
  }));

  const cols = [
    {
      field: 'errorMessage',
      name: I18LABELS.errorMessage,
    },
    {
      name: I18LABELS.impactedPageLoads,
      field: 'percent',
      align: 'right' as const,
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

  return (
    <>
      <EuiTitle size="xs">
        <h3>{I18LABELS.jsErrors}</h3>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiFlexGroup>
        <EuiFlexItem grow={false}>
          <EuiStat
            titleSize="s"
            title={
              <EuiToolTip content={data?.totalErrors ?? 0}>
                <>{numeral(data?.totalErrors ?? 0).format('0 a')}</>
              </EuiToolTip>
            }
            description={I18LABELS.totalErrors}
            isLoading={status !== 'success'}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiStat
            titleSize="s"
            title={i18n.translate('xpack.apm.rum.jsErrors.errorRate', {
              defaultMessage: '{errorRate} %',
              values: {
                errorRate: (
                  ((data?.totalErrorPages ?? 0) / totalPageViews) *
                  100
                ).toFixed(0),
              },
            })}
            description={I18LABELS.errorRate}
            isLoading={status !== 'success'}
          />
        </EuiFlexItem>{' '}
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      <EuiBasicTable
        loading={status !== 'success'}
        responsive={false}
        compressed={true}
        columns={cols}
        items={items}
        onChange={onTableChange}
        pagination={{
          ...pagination,
          totalItemCount: data?.totalErrorGroups ?? 0,
        }}
      />
    </>
  );
}
