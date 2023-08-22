/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CriteriaWithPagination, EuiBasicTableColumn } from '@elastic/eui';
import { EuiFieldSearch } from '@elastic/eui';
import { EuiToolTip } from '@elastic/eui';
import { EuiButtonIcon } from '@elastic/eui';
import { EuiSpacer } from '@elastic/eui';
import { EuiBasicTable, EuiText } from '@elastic/eui';
import React, { useCallback, useMemo, useState } from 'react';
import { FormattedDate, FormattedMessage } from '@kbn/i18n-react';
import type { SendRequestResponse } from '@kbn/es-ui-shared-plugin/public';

import { ApiKeyField } from '../../../../../components/api_key_field';
import type { UninstallTokenMetadata } from '../../../../../../common/types/models/uninstall_token';
import {
  sendGetUninstallToken,
  useGetUninstallTokens,
} from '../../../../../hooks/use_request/uninstall_tokens';
import { useBreadcrumbs, usePagination } from '../../../hooks';
import { DefaultLayout } from '../../../layouts';
import type { GetUninstallTokenResponse } from '../../../../../../common/types/rest_spec/uninstall_token';
import { UninstallCommandFlyout } from '../../../components';

import {
  ACTIONS_TITLE,
  CREATED_AT_TITLE,
  VIEW_UNINSTALL_COMMAND_LABEL,
  POLICY_ID_TITLE,
  SEARCH_BY_POLICY_ID_PLACEHOLDER,
  TOKEN_TITLE,
} from './translations';

const PolicyIdField = ({ policyId }: { policyId: string }) => (
  <EuiText
    size="s"
    className="eui-textTruncate"
    title={policyId}
    data-test-subj="uninstallTokensPolicyIdField"
  >
    {policyId}
  </EuiText>
);

const ViewUninstallCommandButton = ({ onClick }: { onClick: () => void }) => (
  <EuiToolTip content={VIEW_UNINSTALL_COMMAND_LABEL}>
    <EuiButtonIcon
      data-test-subj="uninstallTokensViewCommandButton"
      aria-label={VIEW_UNINSTALL_COMMAND_LABEL}
      onClick={onClick}
      iconType="inspect"
      color="text"
    />
  </EuiToolTip>
);

const NoItemsMessage = ({ isLoading }: { isLoading: boolean }) =>
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
  );

export const UninstallTokenListPage = () => {
  useBreadcrumbs('uninstall_tokens');

  const [policyIdSearch, setPolicyIdSearch] = useState<string>('');
  const [tokenIdForFlyout, setTokenIdForFlyout] = useState<string | null>(null);

  const { pagination, setPagination, pageSizeOptions } = usePagination();

  const { isLoading, data } = useGetUninstallTokens({
    perPage: pagination.pageSize,
    page: pagination.currentPage,
    policyId: policyIdSearch,
  });

  const tokens = data?.items ?? [];
  const total = data?.total ?? 0;

  const columns: Array<EuiBasicTableColumn<UninstallTokenMetadata>> = useMemo(
    () => [
      {
        field: 'policy_id',
        name: POLICY_ID_TITLE,
        render: (policyId: string) => <PolicyIdField policyId={policyId} />,
      },
      {
        field: 'created_at',
        name: CREATED_AT_TITLE,
        width: '130px',
        render: (createdAt: string) =>
          createdAt ? (
            <FormattedDate year="numeric" month="short" day="2-digit" value={createdAt} />
          ) : null,
      },
      {
        field: 'id',
        name: TOKEN_TITLE,
        width: '300px',
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
      {
        field: 'actions',
        name: ACTIONS_TITLE,
        align: 'center',
        width: '70px',
        render: (_: any, { id }: UninstallTokenMetadata) => (
          <ViewUninstallCommandButton onClick={() => setTokenIdForFlyout(id)} />
        ),
      },
    ],
    []
  );

  const handleTablePagination = useCallback(
    ({ page }: CriteriaWithPagination<UninstallTokenMetadata>) => {
      setPagination((prevPagination) => ({
        ...prevPagination,
        currentPage: page.index + 1,
        pageSize: page.size,
      }));
    },
    [setPagination]
  );

  const handleSearch = useCallback(
    (searchString: string): void => {
      setPolicyIdSearch(searchString);
      setPagination((prevPagination) => ({ ...prevPagination, currentPage: 1 }));
    },
    [setPagination]
  );

  return (
    <DefaultLayout section="uninstall_tokens">
      {tokenIdForFlyout && (
        <UninstallCommandFlyout
          onClose={() => setTokenIdForFlyout(null)}
          target="agent"
          uninstallTokenId={tokenIdForFlyout}
        />
      )}

      <EuiText color="subdued" size="s">
        <FormattedMessage
          id="xpack.fleet.uninstallTokenList.pageDescription"
          defaultMessage="Uninstall token allows you to get the uninstall command if you need to uninstall the Agent/Endpoint on the Host."
        />
      </EuiText>

      <EuiSpacer size="m" />

      <EuiFieldSearch
        onSearch={handleSearch}
        incremental
        fullWidth
        placeholder={SEARCH_BY_POLICY_ID_PLACEHOLDER}
        data-test-subj="uninstallTokensPolicyIdSearchInput"
      />

      <EuiSpacer size="m" />

      <EuiBasicTable<UninstallTokenMetadata>
        data-test-subj="uninstallTokenListTable"
        items={tokens}
        columns={columns}
        itemId="id"
        loading={isLoading}
        pagination={{
          pageIndex: pagination.currentPage - 1,
          pageSize: pagination.pageSize,
          totalItemCount: total,
          pageSizeOptions,
        }}
        onChange={handleTablePagination}
        noItemsMessage={<NoItemsMessage isLoading={isLoading} />}
        hasActions={true}
      />

      <EuiSpacer size="xl" />
    </DefaultLayout>
  );
};
