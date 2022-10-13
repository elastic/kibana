/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';

import { useActions, useValues } from 'kea';

import {
  EuiBasicTable,
  EuiBasicTableColumn,
  EuiButton,
  EuiCopy,
  EuiEmptyPrompt,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { EDIT_BUTTON_LABEL, DELETE_BUTTON_LABEL } from '../../../../shared/constants';
import { HiddenText } from '../../../../shared/hidden_text';
import { convertMetaToPagination, handlePageChange } from '../../../../shared/table_pagination';
import { API_KEYS_DOCS_URL } from '../../../routes';
import { TOKEN_TYPE_DISPLAY_NAMES } from '../constants';
import { CredentialsLogic } from '../credentials_logic';
import { ApiToken } from '../types';
import { getModeDisplayText, getEnginesDisplayText } from '../utils';
import { apiTokenSort } from '../utils/api_token_sort';

import { Key } from './key';

export const CredentialsList: React.FC = () => {
  const { deleteApiKey, onPaginate, showCredentialsForm } = useActions(CredentialsLogic);

  const { apiTokens, meta, isCredentialsDataComplete } = useValues(CredentialsLogic);

  const items = useMemo(() => apiTokens.slice().sort(apiTokenSort), [apiTokens]);

  const columns: Array<EuiBasicTableColumn<ApiToken>> = [
    {
      name: i18n.translate('xpack.enterpriseSearch.appSearch.credentials.list.nameTitle', {
        defaultMessage: 'Name',
      }),
      width: '12%',
      render: (token: ApiToken) => token.name,
    },
    {
      name: i18n.translate('xpack.enterpriseSearch.appSearch.credentials.list.typeTitle', {
        defaultMessage: 'Type',
      }),
      width: '15%',
      render: (token: ApiToken) => TOKEN_TYPE_DISPLAY_NAMES[token.type],
    },
    {
      name: i18n.translate('xpack.enterpriseSearch.appSearch.credentials.list.keyTitle', {
        defaultMessage: 'Key',
      }),
      width: '36%',
      className: 'eui-textBreakAll',
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
      mobileOptions: {
        // @ts-ignore - EUI's type definitions need to be updated
        width: '100%',
      },
    },
    {
      name: i18n.translate('xpack.enterpriseSearch.appSearch.credentials.list.modesTitle', {
        defaultMessage: 'Modes',
      }),
      width: '10%',
      render: (token: ApiToken) => getModeDisplayText(token),
    },
    {
      name: i18n.translate('xpack.enterpriseSearch.appSearch.credentials.list.enginesTitle', {
        defaultMessage: 'Engines',
      }),
      width: '18%',
      render: (token: ApiToken) => getEnginesDisplayText(token),
    },
    {
      actions: [
        {
          name: EDIT_BUTTON_LABEL,
          description: i18n.translate('xpack.enterpriseSearch.appSearch.credentials.editKey', {
            defaultMessage: 'Edit API Key',
          }),
          type: 'icon',
          icon: 'pencil',
          color: 'primary',
          onClick: (token: ApiToken) => showCredentialsForm(token),
        },
        {
          name: DELETE_BUTTON_LABEL,
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

  return (
    <EuiBasicTable
      columns={columns}
      items={items}
      noItemsMessage={
        <EuiEmptyPrompt
          iconType="editorStrike"
          title={
            <h2>
              {i18n.translate('xpack.enterpriseSearch.appSearch.credentials.empty.title', {
                defaultMessage: 'Create your first API key',
              })}
            </h2>
          }
          body={i18n.translate('xpack.enterpriseSearch.appSearch.credentials.empty.body', {
            defaultMessage: 'Allow applications to access Elastic App Search on your behalf.',
          })}
          actions={
            <EuiButton size="s" target="_blank" iconType="popout" href={API_KEYS_DOCS_URL}>
              {i18n.translate('xpack.enterpriseSearch.appSearch.credentials.empty.buttonLabel', {
                defaultMessage: 'Learn about API keys',
              })}
            </EuiButton>
          }
        />
      }
      loading={!isCredentialsDataComplete}
      pagination={{
        ...convertMetaToPagination(meta),
        showPerPageOptions: false,
      }}
      onChange={handlePageChange(onPaginate)}
    />
  );
};
