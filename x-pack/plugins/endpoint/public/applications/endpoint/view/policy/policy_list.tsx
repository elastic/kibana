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
  EuiText,
  EuiTableFieldDataColumnType,
  EuiToolTip,
  EuiLink,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage, FormattedNumber } from '@kbn/i18n/react';
import { useDispatch } from 'react-redux';
import styled from 'styled-components';
import { useHistory } from 'react-router-dom';
import { usePageId } from '../use_page_id';
import { FormattedDateAndTime } from '../formatted_date_time';
import {
  selectIsLoading,
  selectPageIndex,
  selectPageSize,
  selectPolicyItems,
  selectTotal,
} from '../../store/policy_list/selectors';
import { usePolicyListSelector } from './policy_hooks';
import { PolicyListAction } from '../../store/policy_list';
import { PolicyData } from '../../types';
import { TruncateText } from '../../components/truncate_text';

interface TableChangeCallbackArguments {
  page: { index: number; size: number };
}

const TruncateTooltipText = styled(TruncateText)`
  .euiToolTipAnchor {
    display: block;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }
`;

const PolicyLink: React.FC<{ name: string; route: string }> = ({ name, route }) => {
  const history = useHistory();

  return (
    <EuiLink
      onClick={(event: React.MouseEvent) => {
        event.preventDefault();
        history.push(route);
      }}
    >
      {name}
    </EuiLink>
  );
};

const renderPolicyNameLink = (value: string, _item: PolicyData) => {
  return <PolicyLink name={value} route={`/policy/${_item.id}`} />;
};

const renderDate = (date: string, _item: PolicyData) => (
  <TruncateTooltipText>
    <EuiToolTip content={date}>
      <FormattedDateAndTime date={new Date(date)} />
    </EuiToolTip>
  </TruncateTooltipText>
);

const renderFormattedNumber = (value: number, _item: PolicyData) => (
  <TruncateText>
    <FormattedNumber value={value} />
  </TruncateText>
);

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
    ({ page: { index, size } }: TableChangeCallbackArguments) => {
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

  const columns: Array<EuiTableFieldDataColumnType<PolicyData>> = useMemo(
    () => [
      {
        field: 'name',
        name: i18n.translate('xpack.endpoint.policyList.nameField', {
          defaultMessage: 'Policy Name',
        }),
        render: renderPolicyNameLink,
        truncateText: true,
      },
      {
        field: 'total',
        name: i18n.translate('xpack.endpoint.policyList.totalField', {
          defaultMessage: 'Total',
        }),
        render: renderFormattedNumber,
        dataType: 'number',
        truncateText: true,
        width: '15ch',
      },
      {
        field: 'pending',
        name: i18n.translate('xpack.endpoint.policyList.pendingField', {
          defaultMessage: 'Pending',
        }),
        render: renderFormattedNumber,
        dataType: 'number',
        truncateText: true,
        width: '15ch',
      },
      {
        field: 'failed',
        name: i18n.translate('xpack.endpoint.policyList.failedField', {
          defaultMessage: 'Failed',
        }),
        render: renderFormattedNumber,
        dataType: 'number',
        truncateText: true,
        width: '15ch',
      },
      {
        field: 'created_by',
        name: i18n.translate('xpack.endpoint.policyList.createdByField', {
          defaultMessage: 'Created By',
        }),
        truncateText: true,
      },
      {
        field: 'created',
        name: i18n.translate('xpack.endpoint.policyList.createdField', {
          defaultMessage: 'Created',
        }),
        render: renderDate,
        truncateText: true,
      },
      {
        field: 'updated_by',
        name: i18n.translate('xpack.endpoint.policyList.updatedByField', {
          defaultMessage: 'Last Updated By',
        }),
        truncateText: true,
      },
      {
        field: 'updated',
        name: i18n.translate('xpack.endpoint.policyList.updatedField', {
          defaultMessage: 'Last Updated',
        }),
        render: renderDate,
        truncateText: true,
      },
    ],
    []
  );

  return (
    <EuiPage data-test-subj="policyListPage">
      <EuiPageBody>
        <EuiPageContent>
          <EuiPageContentHeader>
            <EuiPageContentHeaderSection>
              <EuiTitle size="l">
                <h1 data-test-subj="policyViewTitle">
                  <FormattedMessage
                    id="xpack.endpoint.policyList.viewTitle"
                    defaultMessage="Policies"
                  />
                </h1>
              </EuiTitle>
              <h2>
                <EuiText color="subdued" data-test-subj="policyTotalCount" size="s">
                  <FormattedMessage
                    id="xpack.endpoint.policyList.viewTitleTotalCount"
                    defaultMessage="{totalItemCount} Policies"
                    values={{ totalItemCount }}
                  />
                </EuiText>
              </h2>
            </EuiPageContentHeaderSection>
          </EuiPageContentHeader>
          <EuiPageContentBody>
            <EuiBasicTable
              items={policyItems}
              columns={columns}
              loading={loading}
              pagination={paginationSetup}
              onChange={handleTableChange}
              data-test-subj="policyTable"
            />
          </EuiPageContentBody>
        </EuiPageContent>
      </EuiPageBody>
    </EuiPage>
  );
});
