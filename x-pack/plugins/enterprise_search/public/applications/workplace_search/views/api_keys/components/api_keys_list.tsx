/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useActions, useValues } from 'kea';

import { EuiBasicTable, EuiBasicTableColumn, EuiCopy } from '@elastic/eui';

import { DELETE_BUTTON_LABEL } from '../../../../shared/constants';
import { HiddenText } from '../../../../shared/hidden_text';
import { convertMetaToPagination, handlePageChange } from '../../../../shared/table_pagination';
import { ApiToken } from '../../../types';

import { ApiKeysLogic } from '../api_keys_logic';
import {
  DELETE_API_KEY_BUTTON_DESCRIPTION,
  COPIED_TOOLTIP,
  NAME_TITLE,
  KEY_TITLE,
} from '../constants';

import { ApiKey } from './api_key';

export const ApiKeysList: React.FC = () => {
  const { deleteApiKey, onPaginate } = useActions(ApiKeysLogic);
  const { apiTokens, meta, dataLoading } = useValues(ApiKeysLogic);

  const columns: Array<EuiBasicTableColumn<ApiToken>> = [
    {
      name: NAME_TITLE,
      render: (token: ApiToken) => token.name,
    },
    {
      name: KEY_TITLE,
      className: 'eui-textBreakAll',
      render: (token: ApiToken) => {
        const { key } = token;
        if (!key) return null;

        return (
          <EuiCopy textToCopy={key} afterMessage={COPIED_TOOLTIP}>
            {(copy) => (
              <HiddenText text={key}>
                {({ hiddenText, isHidden, toggle }) => (
                  <ApiKey
                    copy={copy}
                    toggleIsHidden={toggle}
                    isHidden={isHidden}
                    text={hiddenText}
                  />
                )}
              </HiddenText>
            )}
          </EuiCopy>
        );
      },
      mobileOptions: {
        width: '100%',
      },
    },
    {
      actions: [
        {
          name: DELETE_BUTTON_LABEL,
          description: DELETE_API_KEY_BUTTON_DESCRIPTION,
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
      items={apiTokens}
      loading={dataLoading}
      pagination={{
        ...convertMetaToPagination(meta),
        hidePerPageOptions: true,
      }}
      onChange={handlePageChange(onPaginate)}
    />
  );
};
