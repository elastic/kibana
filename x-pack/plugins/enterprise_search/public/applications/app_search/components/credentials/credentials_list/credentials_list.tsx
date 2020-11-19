/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useMemo } from 'react';
import { EuiBasicTable, EuiBasicTableColumn, EuiCopy, EuiEmptyPrompt } from '@elastic/eui';
import { CriteriaWithPagination } from '@elastic/eui/src/components/basic_table/basic_table';
import { useActions, useValues } from 'kea';

import { i18n } from '@kbn/i18n';

import { CredentialsLogic } from '../credentials_logic';
import { Key } from './key';
import { HiddenText } from '../../../../shared/hidden_text';
import { ApiToken } from '../types';
import { TOKEN_TYPE_DISPLAY_NAMES } from '../constants';
import { apiTokenSort } from '../utils/api_token_sort';
import { getModeDisplayText, getEnginesDisplayText } from '../utils';

export const CredentialsList: React.FC = () => {
  const { deleteApiKey, fetchCredentials, showCredentialsForm } = useActions(CredentialsLogic);

  const { apiTokens, meta } = useValues(CredentialsLogic);

  const items = useMemo(() => apiTokens.slice().sort(apiTokenSort), [apiTokens]);

  const columns: Array<EuiBasicTableColumn<ApiToken>> = [
    {
      name: 'Name',
      width: '12%',
      render: (token: ApiToken) => token.name,
    },
    {
      name: 'Type',
      width: '15%',
      render: (token: ApiToken) => TOKEN_TYPE_DISPLAY_NAMES[token.type],
    },
    {
      name: 'Key',
      width: '36%',
      render: (token: ApiToken) => {
        const { key } = token;
        if (!key) return null;
        return (
          <EuiCopy
            textToCopy={key}
            afterMessage={i18n.translate('xpack.enterpriseSearch.appSearch.credentials.copied', {
              defaultMessage: 'Copied',
            })}
          >
            {(copy) => (
              <HiddenText text={key}>
                {({ hiddenText, isHidden, toggle }) => (
                  <Key copy={copy} toggleIsHidden={toggle} isHidden={isHidden} text={hiddenText} />
                )}
              </HiddenText>
            )}
          </EuiCopy>
        );
      },
    },
    {
      name: 'Modes',
      width: '10%',
      render: (token: ApiToken) => getModeDisplayText(token),
    },
    {
      name: 'Engines',
      width: '18%',
      render: (token: ApiToken) => getEnginesDisplayText(token),
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
          onClick: (token: ApiToken) => showCredentialsForm(token),
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
          onClick: (token: ApiToken) => deleteApiKey(token.name),
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

  const onTableChange = ({ page }: CriteriaWithPagination<ApiToken>) => {
    const { index: current } = page;
    fetchCredentials(current + 1);
  };

  return items.length < 1 ? (
    <EuiEmptyPrompt
      iconType="editorStrike"
      title={
        <h2>
          {i18n.translate('xpack.enterpriseSearch.appSearch.credentials.empty.title', {
            defaultMessage: 'No API Keys have been created yet.',
          })}
        </h2>
      }
      body={i18n.translate('xpack.enterpriseSearch.appSearch.credentials.empty.body', {
        defaultMessage: 'Click the "Create a key" button to make your first one.',
      })}
    />
  ) : (
    <EuiBasicTable
      columns={columns}
      items={items}
      pagination={pagination}
      onChange={onTableChange}
    />
  );
};
