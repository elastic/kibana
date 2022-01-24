/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useMemo } from 'react';
import {
  EuiBasicTable,
  EuiText,
  EuiHorizontalRule,
  EuiAvatar,
  EuiFlexGroup,
  EuiFlexItem,
  EuiToolTip,
  CriteriaWithPagination,
} from '@elastic/eui';
import { useQuery } from 'react-query';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { AdministrationListPage } from '../../../components/administration_list_page';
import { useHttp } from '../../../../common/lib/kibana/hooks';
import { sendGetEndpointSpecificPackagePolicies } from '../../../services/policies/policies';
import { FormattedDate } from '../../../../common/components/formatted_date';
import { TextValueDisplay } from '../../../components/artifact_entry_card/components/text_value_display';
import { EndpointPolicyLink } from '../../endpoint_hosts/view/components/endpoint_policy_link';
import { PolicyData } from '../../../../../common/endpoint/types';
import { useUrlPagination } from '../../../components/hooks/use_url_pagination';

const MAX_PAGINATED_ITEM = 9999;
export const PolicyList = memo(() => {
  const http = useHttp();
  const { pagination, pageSizeOptions, setPagination } = useUrlPagination();
  const result = useQuery(['policyList'], () => {
    return sendGetEndpointSpecificPackagePolicies(http, {
      query: {
        page: pagination.currentPage,
        perPage: pagination.pageSize,
      },
    });
  });

  const totalItemCount = useMemo(() => {
    return result.data ? result.data.items.length : 0;
  }, [result]);

  const policyColumns = useMemo(() => {
    const updatedAtColumnName = i18n.translate('xpack.securitySolution.policy.list.updatedAt', {
      defaultMessage: 'Last Updated',
    });

    const createdAtColumnName = i18n.translate('xpack.securitySolution.policy.list.createdAt', {
      defaultMessage: 'Date Created',
    });

    return [
      {
        field: '',
        name: 'Name',
        truncateText: true,
        render: (policy: PolicyData) => {
          return (
            <EuiToolTip content={policy.name} anchorClassName="eui-textTruncate">
              <EndpointPolicyLink
                policyId={policy.id}
                className="eui-textTruncate"
                data-test-subj="policyNameCellLink"
              >
                {policy.name}
              </EndpointPolicyLink>
            </EuiToolTip>
          );
        },
      },
      {
        field: 'created_by',
        name: 'Created by',
        truncateText: true,
        render: (name: string) => {
          return (
            <EuiFlexGroup responsive={false} gutterSize={'xs'} alignItems="center">
              <EuiFlexItem grow={false}>
                <EuiAvatar name={name} data-test-subj={'created-by-avatar'} size="s" />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <TextValueDisplay>{name}</TextValueDisplay>
              </EuiFlexItem>
            </EuiFlexGroup>
          );
        },
      },
      {
        field: 'created_at',
        name: createdAtColumnName,
        truncateText: true,
        render: (date: string) => {
          return (
            <FormattedDate
              fieldName={createdAtColumnName}
              value={date}
              className="eui-textTruncate"
            />
          );
        },
      },
      {
        field: 'updated_by',
        name: 'Last updated by',
        truncateText: true,
        render: (name: string) => {
          return (
            <EuiFlexGroup responsive={false} gutterSize={'xs'} alignItems="center">
              <EuiFlexItem grow={false}>
                <EuiAvatar name={name} data-test-subj={'updated-by-avatar'} size="s" />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <TextValueDisplay>{name}</TextValueDisplay>
              </EuiFlexItem>
            </EuiFlexGroup>
          );
        },
      },
      {
        field: 'updated_at',
        name: updatedAtColumnName,
        truncateText: true,
        render: (date: string) => {
          return (
            <FormattedDate
              fieldName={updatedAtColumnName}
              value={date}
              className="eui-textTruncate"
            />
          );
        },
      },
      { field: '-', name: 'Endpoints' },
      { field: '-', name: 'Actions' },
    ];
  }, []);

  const handleTableOnChange = useCallback(
    ({ page }: CriteriaWithPagination<PolicyData>) => {
      setPagination({
        currentPage: page.index + 1,
        pageSize: page.size,
      });
    },
    [setPagination]
  );

  const tablePagination = useMemo(() => {
    return {
      pageIndex: pagination.currentPage - 1,
      pageSize: pagination.pageSize,
      totalItemCount,
      pageSizeOptions,
    };
  }, [totalItemCount, pageSizeOptions, pagination.currentPage, pagination.pageSize]);

  return (
    <AdministrationListPage
      data-test-subj="policyListPage"
      title={i18n.translate('xpack.securitySolution.policy.list.title', {
        defaultMessage: 'Policy List',
      })}
      subtitle={i18n.translate('xpack.securitySolution.policy.list.subtitle', {
        defaultMessage: 'List of all the policies',
      })}
    >
      {result.data && (
        <>
          <EuiText color="subdued" size="xs" data-test-subj="endpointListTableTotal">
            {totalItemCount > MAX_PAGINATED_ITEM + 1 ? (
              <FormattedMessage
                id="xpack.securitySolution.policy.list.totalCount.limited"
                defaultMessage="Showing {limit} of {totalItemCount, plural, one {# policy} other {# policies}}"
                values={{ totalItemCount, limit: MAX_PAGINATED_ITEM + 1 }}
              />
            ) : (
              <FormattedMessage
                id="xpack.securitySolution.policy.list.totalCount"
                defaultMessage="Showing {totalItemCount, plural, one {# endpoint} other {# policies}}"
                values={{ totalItemCount }}
              />
            )}
          </EuiText>
          <EuiHorizontalRule margin="xs" />
          <EuiBasicTable
            data-test-subj="policyListTable"
            items={result.data.items}
            columns={policyColumns}
            pagination={tablePagination}
            onChange={handleTableOnChange}
            loading={result.isLoading}
          />
        </>
      )}
    </AdministrationListPage>
  );
});

PolicyList.displayName = 'PolicyList';
