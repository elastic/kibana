/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiBasicTable, EuiButtonIcon, EuiCopy } from '@elastic/eui';
import { useActions, useValues } from 'kea';
import { CriteriaWithPagination } from '@elastic/eui/src/components/basic_table/basic_table';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';

import {
  CredentialsLogic,
  ICredentialsLogicActions,
  ICredentialsLogicValues,
} from '../credentials_logic';
import { IApiToken } from '../types';
import { TOKEN_TYPE_DISPLAY_NAMES } from '../constants';
import { apiTokenSort } from '../utils/api_token_sort';
import { getModeDisplayText, getEnginesDisplayText } from '../utils';

export const CredentialsList: React.FC = () => {
  const { deleteApiKey, fetchCredentials, showCredentialsForm } = useActions(
    CredentialsLogic
  ) as ICredentialsLogicActions;

  const { apiTokens, meta } = useValues(CredentialsLogic) as ICredentialsLogicValues;

  const items = apiTokens.slice().sort(apiTokenSort);

  const columns = [
    {
      name: 'Test',
      width: '12%',
      render: (item: IApiToken) => {
        return <div>{item.name}</div>;
      },
    },
    {
      name: 'Type',
      width: '18%',
      render: (item: IApiToken) => {
        return <div>{TOKEN_TYPE_DISPLAY_NAMES[item.type]}</div>;
      },
    },
    {
      name: 'Key',
      width: '43%',
      render: (item: IApiToken) => {
        return (
          <div>
            <EuiCopy
              textToCopy={item.key || ''}
              afterMessage={i18n.translate('xpack.enterpriseSearch.appSearch.credentials.copied', {
                defaultMessage: 'Copied',
              })}
            >
              {(copy) => (
                <div>
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
                  {item.key}
                </div>
              )}
            </EuiCopy>
          </div>
        );
      },
    },
    {
      name: 'Modes',
      width: '10%',
      render: (item: IApiToken) => {
        return <div>{getModeDisplayText(item)}</div>;
      },
    },
    {
      name: 'Engines',
      width: '10%',
      render: (item: IApiToken) => {
        return <div>{getEnginesDisplayText(item)}</div>;
      },
    },
    {
      width: '4%',
      render: (item: IApiToken) => {
        return (
          <EuiButtonIcon
            onClick={() => showCredentialsForm(item)}
            iconType="pencil"
            aria-label={i18n.translate('xpack.enterpriseSearch.appSearch.credentials.editKey', {
              defaultMessage: 'Edit API Key',
            })}
          />
        );
      },
    },
    {
      width: '4%',
      render: (item: IApiToken) => {
        return (
          <EuiButtonIcon
            onClick={() => item.name && deleteApiKey(item.name)}
            iconType="trash"
            aria-label={i18n.translate('xpack.enterpriseSearch.appSearch.credentials.deleteKey', {
              defaultMessage: 'Delete API Key',
            })}
          />
        );
      },
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
