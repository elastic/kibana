/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useMemo } from 'react';
import { EuiBasicTable, EuiBasicTableColumn, EuiButtonIcon, EuiCopy } from '@elastic/eui';
import { CriteriaWithPagination } from '@elastic/eui/src/components/basic_table/basic_table';
import { useActions, useValues } from 'kea';

import { i18n } from '@kbn/i18n';

import { CredentialsLogic } from '../credentials_logic';
import { IApiToken } from '../types';
import { TOKEN_TYPE_DISPLAY_NAMES } from '../constants';
import { apiTokenSort } from '../utils/api_token_sort';
import { getModeDisplayText, getEnginesDisplayText } from '../utils';

export const CredentialsList: React.FC = () => {
  const { deleteApiKey, fetchCredentials, showCredentialsForm } = useActions(CredentialsLogic);

  const { apiTokens, meta } = useValues(CredentialsLogic);

  const items = useMemo(() => apiTokens.slice().sort(apiTokenSort), [apiTokens]);

  const columns: Array<EuiBasicTableColumn<IApiToken>> = [
    {
      name: 'Name',
      width: '12%',
      render: (token: IApiToken) => token.name,
    },
    {
      name: 'Type',
      width: '15%',
      render: (token: IApiToken) => TOKEN_TYPE_DISPLAY_NAMES[token.type],
    },
    {
      name: 'Key',
      width: '36%',
      render: (token: IApiToken) => {
        if (!token.key) return null;
        return (
          <EuiCopy
            textToCopy={token.key}
            afterMessage={i18n.translate('xpack.enterpriseSearch.appSearch.credentials.copied', {
              defaultMessage: 'Copied',
            })}
          >
            {(copy) => (
              <>
                <EuiButtonIcon
                  onClick={copy}
                  iconType="copyClipboard"
                  aria-label={i18n.translate(
                    'xpack.enterpriseSearch.appSearch.credentials.copyApiKey',
                    {
                      defaultMessage: 'Copy API Key to clipboard',
                    }
                  )}
                />
                {token.key}
              </>
            )}
          </EuiCopy>
        );
      },
    },
    {
      name: 'Modes',
      width: '10%',
      render: (token: IApiToken) => getModeDisplayText(token),
    },
    {
      name: 'Engines',
      width: '18%',
      render: (token: IApiToken) => getEnginesDisplayText(token),
    },
    {
      actions: [
        {
          name: i18n.translate('xpack.enterpriseSearch.actions.edit', {
            defaultMessage: 'Edit',
          }),
          description: i18n.translate('xpack.enterpriseSearch.appSearch.credentials.editKey', {
            defaultMessage: 'Edit API Key',
          }),
          type: 'icon',
          icon: 'pencil',
          color: 'primary',
          onClick: (token: IApiToken) => showCredentialsForm(token),
        },
        {
          name: i18n.translate('xpack.enterpriseSearch.actions.delete', {
            defaultMessage: 'Delete',
          }),
          description: i18n.translate('xpack.enterpriseSearch.appSearch.credentials.deleteKey', {
            defaultMessage: 'Delete API Key',
          }),
          type: 'icon',
          icon: 'trash',
          color: 'danger',
          onClick: (token: IApiToken) => deleteApiKey(token.name),
        },
      ],
    },
  ];

  const pagination = {
    pageIndex: meta.page ? meta.page.current - 1 : 0,
    pageSize: meta.page ? meta.page.size : 0,
    totalItemCount: meta.page ? meta.page.total_results : 0,
    hidePerPageOptions: true,
  };

  const onTableChange = ({ page }: CriteriaWithPagination<IApiToken>) => {
    const { index: current } = page;
    fetchCredentials(current + 1);
  };

  return (
    <EuiBasicTable
      columns={columns}
      items={items}
      pagination={pagination}
      onChange={onTableChange}
    />
  );
};
