/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useCallback, useMemo } from 'react';
import {
  EuiPage,
  EuiPageBody,
  EuiPageContent,
  EuiPageContentBody,
  EuiPageContentHeader,
  EuiPageContentHeaderSection,
  EuiTitle,
  EuiBasicTable,
  EuiTextColor,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage, FormattedDate, FormattedTime } from '@kbn/i18n/react';
import { useDispatch } from 'react-redux';
import { usePageId } from '../use_page_id';
import {
  selectIsLoading,
  selectPageIndex,
  selectPageSize,
  selectPolicyItems,
  selectTotal,
} from '../../store/policy_list/selectors';
import { usePolicyListSelector } from './policy_hooks';
import { PolicyListAction } from '../../store/policy_list';

interface TTableChangeCallbackArguments {
  page: { index: number; size: number };
}

const FormattedDateAndTime: React.FC<{ date: Date }> = ({ date }) => {
  return (
    <span title={date.toISOString()}>
      <FormattedDate value={date} year="numeric" month="short" day="2-digit" />
      {' @ '}
      <FormattedTime value={date} />
    </span>
  );
};

const renderDate = (d: any) => <FormattedDateAndTime date={new Date(d as string)} />;

export const PolicyList = React.memo(() => {
  usePageId('policyListPage');

  const dispatch = useDispatch<(action: PolicyListAction) => void>();
  const policyItems = usePolicyListSelector(selectPolicyItems);
  const pageIndex = usePolicyListSelector(selectPageIndex);
  const pageSize = usePolicyListSelector(selectPageSize);
  const totalItemCount = usePolicyListSelector(selectTotal);
  const loading = usePolicyListSelector(selectIsLoading);

  const paginationSetup = useMemo(() => {
    return {
      pageIndex,
      pageSize,
      totalItemCount,
      pageSizeOptions: [10, 20, 50],
      hidePerPageOptions: false,
    };
  }, [pageIndex, pageSize, totalItemCount]);

  const handleTableChange = useCallback(
    ({ page: { index, size } }: TTableChangeCallbackArguments) => {
      dispatch({
        type: 'userPaginatedPolicyListTable',
        payload: {
          pageIndex: index,
          pageSize: size,
        },
      });
    },
    [dispatch]
  );

  const columns = useMemo(
    () => [
      {
        field: 'name',
        name: i18n.translate('xpack.endpoint.policyList.nameField', {
          defaultMessage: 'Policy Name',
        }),
      },
      {
        field: 'total',
        name: i18n.translate('xpack.endpoint.policyList.totalField', {
          defaultMessage: 'Total',
        }),
      },
      {
        field: 'pending',
        name: i18n.translate('xpack.endpoint.policyList.pendingField', {
          defaultMessage: 'Pending',
        }),
      },
      {
        field: 'failed',
        name: i18n.translate('xpack.endpoint.policyList.failedField', {
          defaultMessage: 'Failed',
        }),
      },
      {
        field: 'created_by',
        name: i18n.translate('xpack.endpoint.policyList.createdByField', {
          defaultMessage: 'Created By',
        }),
      },
      {
        field: 'created',
        name: i18n.translate('xpack.endpoint.policyList.createdField', {
          defaultMessage: 'Created',
        }),
        render: renderDate,
      },
      {
        field: 'updated_by',
        name: i18n.translate('xpack.endpoint.policyList.updatedByField', {
          defaultMessage: 'Last Updated By',
        }),
      },
      {
        field: 'updated',
        name: i18n.translate('xpack.endpoint.policyList.updatedField', {
          defaultMessage: 'Last Updated',
        }),
        render: renderDate,
      },
    ],
    []
  );

  return (
    <EuiPage>
      <EuiPageBody>
        <EuiPageContent>
          <EuiPageContentHeader>
            <EuiPageContentHeaderSection>
              <EuiTitle>
                <h2 data-test-subj="policyViewTitle">
                  <FormattedMessage
                    id="xpack.endpoint.policyList.viewTitle"
                    defaultMessage="Policies"
                  />
                </h2>
              </EuiTitle>
              <h3>
                <EuiTextColor color="subdued">
                  <FormattedMessage
                    id="xpack.endpoint.policyList.viewTitleTotalCount"
                    defaultMessage="{totalItemCount} Policies"
                    values={{ totalItemCount }}
                  />
                </EuiTextColor>
              </h3>
            </EuiPageContentHeaderSection>
          </EuiPageContentHeader>
          <EuiPageContentBody>
            <EuiBasicTable
              items={policyItems}
              columns={columns}
              loading={loading}
              pagination={paginationSetup}
              onChange={handleTableChange}
            />
          </EuiPageContentBody>
        </EuiPageContent>
      </EuiPageBody>
    </EuiPage>
  );
});
