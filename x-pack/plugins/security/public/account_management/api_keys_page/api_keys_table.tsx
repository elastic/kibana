/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FunctionComponent } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
// @ts-ignore
import { formatDate } from '@elastic/eui/lib/services/format';
import {
  EuiBadge,
  EuiButtonEmpty,
  EuiHideFor,
  EuiInMemoryTable,
  EuiInMemoryTableProps,
  EuiShowFor,
  EuiText,
  EuiButtonIcon,
} from '@elastic/eui';
import { ApiKey } from '../../../common/model';

export type ApiKeysTableProps = Omit<EuiInMemoryTableProps<ApiKey>, 'columns'> & {
  createdItemId?: ApiKey['id'];
  onInvalidateItem(item: ApiKey): void;
};

export const ApiKeysTable: FunctionComponent<ApiKeysTableProps> = ({
  createdItemId,
  onInvalidateItem,
  ...props
}) => {
  const actions = [
    {
      render: (item: ApiKey) => (
        <>
          <EuiShowFor sizes={['xs', 's']}>
            <EuiButtonIcon
              iconType="minusInCircle"
              color="danger"
              aria-label={i18n.translate(
                'xpack.security.accountManagement.apiKeys.invalidateButton',
                {
                  defaultMessage: 'Invalidate',
                }
              )}
              disabled={props.loading}
              onClick={() => onInvalidateItem(item)}
            />
          </EuiShowFor>
          <EuiHideFor sizes={['xs', 's']}>
            <EuiButtonEmpty
              iconType="minusInCircle"
              color="danger"
              flush="right"
              disabled={props.loading}
              onClick={() => onInvalidateItem(item)}
            >
              <FormattedMessage
                id="xpack.security.accountManagement.apiKeys.invalidateButton"
                defaultMessage="Invalidate"
              />
            </EuiButtonEmpty>
          </EuiHideFor>
        </>
      ),
    },
  ];

  return (
    <EuiInMemoryTable
      {...props}
      items={props.loading && !createdItemId ? [] : props.items}
      tableCaption={i18n.translate('xpack.security.accountManagement.apiKeys.tableCaption', {
        defaultMessage: 'Below is a table of your API Keys.',
      })}
      message={
        props.loading
          ? i18n.translate('xpack.security.accountManagement.apiKeys.loadingMessage', {
              defaultMessage: 'Loading API keys…',
            })
          : undefined
      }
      columns={[
        {
          field: 'name',
          name: i18n.translate('xpack.security.accountManagement.apiKeys.nameHeader', {
            defaultMessage: 'Name',
          }),
          width: '25%',
        },
        {
          field: 'expiration',
          name: i18n.translate('xpack.security.accountManagement.apiKeys.expiresHeader', {
            defaultMessage: 'Expires',
          }),
          render: (expiration: number) =>
            !expiration ? (
              <EuiText color="subdued">
                <FormattedMessage
                  id="xpack.security.accountManagement.apiKeys.neverExpires"
                  defaultMessage="Never"
                />
              </EuiText>
            ) : (
              formatDate(expiration)
            ),
          width: '25%',
          mobileOptions: { show: false },
        },
        {
          field: 'creation',
          name: i18n.translate('xpack.security.accountManagement.apiKeys.createdHeader', {
            defaultMessage: 'Created',
          }),
          render: (creation: number, item: ApiKey) =>
            item.id === createdItemId ? (
              <EuiBadge color="secondary">
                <FormattedMessage
                  id="xpack.security.accountManagement.apiKeys.createdBadge"
                  defaultMessage="Just now"
                />
              </EuiBadge>
            ) : (
              formatDate(creation)
            ),
          width: '25%',
        },
        {
          actions,
          width: '25%',
        },
      ]}
      sorting={{
        sort: {
          field: 'creation',
          direction: 'desc',
        },
      }}
      pagination={true}
    />
  );
};
