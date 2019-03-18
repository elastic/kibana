/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiBadge,
  EuiCodeBlock,
  EuiInMemoryTable,
  EuiLink,
  EuiPanel,
  EuiText,
  EuiTextColor,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import moment from 'moment';
import React from 'react';
import { Link } from 'react-router-dom';
import { ErrorListItem, Ping } from '../../../common/graphql/types';

interface ErrorListProps {
  loading: boolean;
  errorList?: ErrorListItem[];
}

export const ErrorList = ({ loading, errorList }: ErrorListProps) => (
  <EuiPanel paddingSize="s">
    <EuiTitle size="xs">
      <h5>
        <FormattedMessage id="xpack.uptime.errorList.title" defaultMessage="Errors" />
      </h5>
    </EuiTitle>
    <EuiInMemoryTable
      loading={loading}
      items={errorList}
      columns={[
        {
          field: 'count',
          width: '200px',
          name: i18n.translate('xpack.uptime.errorList.CountColumnLabel', {
            defaultMessage: 'Frequency',
          }),
          render: (count: number, item: Ping) => (
            <div>
              <EuiText size="s">
                <EuiTextColor color="danger">{count}</EuiTextColor> errors
              </EuiText>
              <EuiText size="xs" color="subdued">
                Latest was {moment(item.timestamp).fromNow()}
              </EuiText>
            </div>
          ),
        },
        {
          field: 'type',
          name: i18n.translate('xpack.uptime.errorList.errorTypeColumnLabel', {
            defaultMessage: 'Error type',
          }),
        },
        {
          field: 'monitorId',
          name: i18n.translate('xpack.uptime.errorList.monitorIdColumnLabel', {
            defaultMessage: 'Monitor ID',
          }),
          render: (id: string, { name }: ErrorListItem) => (
            <EuiLink>
              <Link to={`/monitor/${id}`}>{name || id}</Link>
            </EuiLink>
          ),
          width: '25%',
        },
        {
          field: 'statusCode',
          name: i18n.translate('xpack.uptime.errorList.statusCodeColumnLabel', {
            defaultMessage: 'Status code',
          }),
          render: (statusCode: string) => (statusCode ? <EuiBadge>{statusCode}</EuiBadge> : null),
        },
        {
          field: 'latestMessage',
          name: i18n.translate('xpack.uptime.errorList.latestMessageColumnLabel', {
            defaultMessage: 'Latest message',
          }),
          width: '40%',
          render: (message: string) => (
            <div>
              {
                // TODO: remove this ignore when prop is defined on type
                // @ts-ignore size is not currently defined on the type for EuiCodeBlock
                <EuiCodeBlock transparentBackground size="xs" paddingSize="none">
                  {message}
                </EuiCodeBlock>
              }
            </div>
          ),
        },
      ]}
      pagination={{ initialPageSize: 10, pageSizeOptions: [5, 10, 20, 50] }}
    />
  </EuiPanel>
);
