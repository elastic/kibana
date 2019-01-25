/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiBadge, EuiToolTip } from '@elastic/eui';
import numeral from '@elastic/numeral';
import { i18n } from '@kbn/i18n';
import moment from 'moment';
import React from 'react';
import styled from 'styled-components';
import { NOT_AVAILABLE_LABEL } from 'x-pack/plugins/apm/common/i18n';
import { IUrlParams } from 'x-pack/plugins/apm/public/store/urlParams';
import { ErrorGroupListAPIResponse } from 'x-pack/plugins/apm/server/lib/errors/get_error_groups';
import {
  fontFamilyCode,
  fontSizes,
  px,
  truncate,
  unit
} from '../../../../style/variables';
import { KibanaLink } from '../../../shared/Links/KibanaLink';
import { ITableColumn, ManagedTable } from '../../../shared/ManagedTable';

interface Props {
  items: ErrorGroupListAPIResponse;
  urlParams: IUrlParams;
}

const GroupIdLink = styled(KibanaLink)`
  font-family: ${fontFamilyCode};
`;

const MessageAndCulpritCell = styled.div`
  ${truncate('100%')};
`;

const MessageLink = styled(KibanaLink)`
  font-family: ${fontFamilyCode};
  font-size: ${fontSizes.large};
  ${truncate('100%')};
`;

const Culprit = styled.div`
  font-family: ${fontFamilyCode};
`;

export function ErrorGroupList({ items, urlParams, ...rest }: Props) {
  const { serviceName, sortDirection, sortField } = urlParams;
  const columns: ITableColumn[] = [
    {
      name: i18n.translate('xpack.apm.errorsTable.groupIdColumnLabel', {
        defaultMessage: 'Group ID'
      }),
      field: 'groupId',
      sortable: false,
      width: px(unit * 6),
      render: groupId => {
        return (
          <GroupIdLink hash={`/${serviceName}/errors/${groupId}`}>
            {groupId.slice(0, 5) || NOT_AVAILABLE_LABEL}
          </GroupIdLink>
        );
      }
    },
    {
      name: i18n.translate(
        'xpack.apm.errorsTable.errorMessageAndCulpritColumnLabel',
        {
          defaultMessage: 'Error message and culprit'
        }
      ),
      field: 'message',
      sortable: false,
      width: '50%',
      render: (message, item) => {
        return (
          <MessageAndCulpritCell>
            <EuiToolTip
              id="error-message-tooltip"
              content={message || NOT_AVAILABLE_LABEL}
            >
              <MessageLink hash={`/${serviceName}/errors/${item.groupId}`}>
                {message || NOT_AVAILABLE_LABEL}
              </MessageLink>
            </EuiToolTip>
            <br />
            <EuiToolTip
              id="error-culprit-tooltip"
              content={item.culprit || NOT_AVAILABLE_LABEL}
            >
              <Culprit>{item.culprit || NOT_AVAILABLE_LABEL}</Culprit>
            </EuiToolTip>
          </MessageAndCulpritCell>
        );
      }
    },
    {
      name: '',
      field: 'handled',
      sortable: false,
      align: 'right',
      render: isUnhandled =>
        isUnhandled === false && (
          <EuiBadge color="warning">
            {i18n.translate('xpack.apm.errorsTable.unhandledLabel', {
              defaultMessage: 'Unhandled'
            })}
          </EuiBadge>
        )
    },
    {
      name: i18n.translate('xpack.apm.errorsTable.occurrencesColumnLabel', {
        defaultMessage: 'Occurrences'
      }),
      field: 'occurrenceCount',
      sortable: true,
      dataType: 'number',
      render: value =>
        value ? numeral(value).format('0.[0]a') : NOT_AVAILABLE_LABEL
    },
    {
      field: 'latestOccurrenceAt',
      sortable: true,
      name: i18n.translate(
        'xpack.apm.errorsTable.latestOccurrenceColumnLabel',
        {
          defaultMessage: 'Latest occurrence'
        }
      ),
      align: 'right',
      render: value => (value ? moment(value).fromNow() : NOT_AVAILABLE_LABEL)
    }
  ];

  return (
    <ManagedTable
      columns={columns}
      items={items}
      initialSort={{
        field: sortField || 'latestOccurrenceAt',
        direction: sortDirection || 'desc'
      }}
      initialPageSize={25}
      {...rest}
    />
  );
}
