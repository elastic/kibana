/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBasicTable, EuiText } from '@elastic/eui';
import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';

import type { UninstallTokenMetadata } from '../../../../../../common/types/models/uninstall_token';

import { useGetUninstallTokens } from '../../../../../hooks/use_request/uninstall_tokens';

import { useBreadcrumbs } from '../../../hooks';
import { DefaultLayout } from '../../../layouts';

export const UninstallTokenListPage = () => {
  useBreadcrumbs('uninstall_tokens');

  const { isLoading, data } = useGetUninstallTokens();

  const tokens = data?.items ?? [];

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
          { field: 'created_at', name: 'Created at', dataType: 'date' },
          {
            field: 'id',
            name: 'Token',
            render: (uninstallTokenId: string) => '•••',
          },
        ]}
        loading={isLoading}
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
    </DefaultLayout>
  );
};
