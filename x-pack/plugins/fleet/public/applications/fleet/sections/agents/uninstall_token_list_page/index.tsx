/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CriteriaWithPagination } from '@elastic/eui';
import { EuiSpacer } from '@elastic/eui';
import { EuiBasicTable, EuiText } from '@elastic/eui';
import React from 'react';
import { FormattedDate, FormattedMessage } from '@kbn/i18n-react';

import type { SendRequestResponse } from '@kbn/es-ui-shared-plugin/public';

import type { UninstallTokenMetadata } from '../../../../../../common/types/models/uninstall_token';

import {
  sendGetUninstallToken,
  useGetUninstallTokens,
} from '../../../../../hooks/use_request/uninstall_tokens';

import { useBreadcrumbs, usePagination } from '../../../hooks';
import { DefaultLayout } from '../../../layouts';
import { ApiKeyField } from '../enrollment_token_list_page';
import type { GetUninstallTokenResponse } from '../../../../../../common/types/rest_spec/uninstall_token';

export const UninstallTokenListPage = () => {
  useBreadcrumbs('uninstall_tokens');

  const { pagination, setPagination, pageSizeOptions } = usePagination();

  const { isLoading, data } = useGetUninstallTokens({
    perPage: pagination.pageSize,
    page: pagination.currentPage,
  });

  const tokens = data?.items ?? [];
  const total = data?.total ?? 0;

  return (
    <DefaultLayout section="uninstall_tokens">
      <EuiText color="subdued">
        <FormattedMessage
          id="xpack.fleet.uninstallTokenList.pageDescription"
          defaultMessage="Uninstall token allows you to get the uninstall command if you need to uninstall the Agent/Endpoint on the Host."
        />
      </EuiText>

      <EuiBasicTable<UninstallTokenMetadata>
        data-test-subj="uninstallTokenListTable"
        items={tokens}
        columns={[
          { field: 'policy_id', name: 'Policy ID' },
          {
            field: 'created_at',
            name: 'Created at',
            render: (createdAt: string) =>
              createdAt ? (
                <FormattedDate year="numeric" month="short" day="2-digit" value={createdAt} />
              ) : null,
          },
          {
            field: 'id',
            name: 'Token',
            render: (uninstallTokenId: string) => (
              <ApiKeyField
                apiKeyId={uninstallTokenId}
                sendGetAPIKey={sendGetUninstallToken}
                tokenGetter={(response: SendRequestResponse<GetUninstallTokenResponse>) =>
                  response.data?.item.token
                }
                length={32}
              />
            ),
          },
        ]}
        loading={isLoading}
        pagination={{
          pageIndex: pagination.currentPage - 1,
          pageSize: pagination.pageSize,
          totalItemCount: total,
          pageSizeOptions,
        }}
        onChange={({ page }: CriteriaWithPagination<UninstallTokenMetadata>) => {
          setPagination((prevPagination) => ({
            ...prevPagination,
            currentPage: page.index + 1,
            pageSize: page.size,
          }));
        }}
        noItemsMessage={
          isLoading ? (
            <FormattedMessage
              id="xpack.fleet.uninstallTokenList.loadingTokensMessage"
              defaultMessage="Loading uninstall tokens..."
            />
          ) : (
            <FormattedMessage
              id="xpack.fleet.uninstallTokenList.emptyMessage"
              defaultMessage="No uninstall tokens found."
            />
          )
        }
      />

      <EuiSpacer size="xl" />
    </DefaultLayout>
  );
};
