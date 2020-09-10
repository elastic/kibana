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
import { HiddenText } from '../../../../shared/hidden_text';

import {
  CredentialsLogic,
  ICredentialsLogicActions,
  ICredentialsLogicValues,
  apiTokenSort,
} from '../credentials_logic';
import { TOKEN_TYPE_DISPLAY_NAMES, ADMIN, SEARCH } from '../../../constants/credentials';
import { IApiToken } from '../../../../../../common/types/app_search';

import { getEnginesDisplayText } from './get_engines_display_text';
import { getModeDisplayText } from './get_mode_display_text';

export const CredentialsList: React.FC = () => {
  const { deleteApiKey, fetchCredentials, toggleCredentialsForm } = useActions(
    CredentialsLogic
  ) as ICredentialsLogicActions;

  const { apiTokens, meta } = useValues(CredentialsLogic) as ICredentialsLogicValues;

  const items = apiTokens.slice().sort(apiTokenSort);

  const columns = [
    {
      name: 'Test',
      width: '12%',
      render: (item) => {
        return <div>{item.name}</div>;
      },
    },
    {
      name: 'Type',
      width: '18%',
      render: (item) => {
        return <div>{TOKEN_TYPE_DISPLAY_NAMES[item.type]}</div>;
      },
    },
    {
      name: 'Key',
      width: '43%',
      render: (item) => {
        return (
          <EuiCopy
            textToCopy={item.key}
            afterMessage={i18n.translate('xpack.enterpriseSearch.appSearch.credentials.copied', {
              defaultMessage: 'Copied',
            })}
          >
            {(copy) => (
              <HiddenText text={item.key}>
                {({ hiddenText, isHidden, toggle }) => {
                  const icon = isHidden ? 'eye' : 'eyeClosed';
                  return (
                    <div>
                      <EuiButtonIcon
                        onClick={() => copy()}
                        iconType="copyClipboard"
                        aria-label={i18n.translate(
                          'xpack.enterpriseSearch.appSearch.credentials.copyApiKey',
                          {
                            defaultMessage: 'Copy API Key to clipboard',
                          }
                        )}
                      />
                      <EuiButtonIcon
                        onClick={toggle}
                        iconType={icon}
                        aria-label={i18n.translate(
                          'xpack.enterpriseSearch.appSearch.credentials.toggleApiEndpoint',
                          {
                            defaultMessage: 'Toggle API key visibility',
                          }
                        )}
                      />
                      {hiddenText}
                    </div>
                  );
                }}
              </HiddenText>
            )}
          </EuiCopy>
        );
      },
    },
    {
      name: 'Modes',
      width: '10%',
      render: (item) => {
        return <div>{getModeDisplayText(item)}</div>;
      },
    },
    {
      name: 'Engines',
      width: '10%',
      render: (item) => {
        return <div>{getEnginesDisplayText(item)}</div>;
      },
    },
    {
      width: '4%',
      render: (item) => {
        return (
          <EuiButtonIcon
            onClick={() => toggleCredentialsForm(item)}
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
      render: (item) => {
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
    pageIndex: meta.page.current - 1,
    pageSize: meta.page.size,
    totalItemCount: meta.page.total_results,
    hidePerPageOptions: true,
  };

  const onTableChange = ({ page }: CriteriaWithPagination<IApiToken>) => {
    const { index: current } = page;
    fetchCredentials(current + 1);
  };

  // TODO StuiEmptyState from ent-search
  return (
    <EuiBasicTable
      columns={columns}
      items={items}
      pagination={pagination}
      onChange={onTableChange}
    />
  );
};
