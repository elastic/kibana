/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiBadge, EuiToolTip } from '@elastic/eui';
import numeral from '@elastic/numeral';
import { i18n } from '@kbn/i18n';
import React, { useMemo } from 'react';
import styled from 'styled-components';
import { EuiIconTip } from '@elastic/eui';
import { NOT_AVAILABLE_LABEL } from '../../../../../common/i18n';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { ErrorGroupListAPIResponse } from '../../../../../server/lib/errors/get_error_groups';
import {
  fontFamilyCode,
  fontSizes,
  px,
  truncate,
  unit,
} from '../../../../style/variables';
import { useUrlParams } from '../../../../hooks/useUrlParams';
import { ManagedTable } from '../../../shared/ManagedTable';
import { ErrorDetailLink } from '../../../shared/Links/apm/ErrorDetailLink';
import { TimestampTooltip } from '../../../shared/TimestampTooltip';
import { ErrorOverviewLink } from '../../../shared/Links/apm/ErrorOverviewLink';
import { APMQueryParams } from '../../../shared/Links/url_helpers';

const GroupIdLink = styled(ErrorDetailLink)`
  font-family: ${fontFamilyCode};
`;

const MessageAndCulpritCell = styled.div`
  ${truncate('100%')};
`;

const ErrorLink = styled(ErrorOverviewLink)`
  ${truncate('100%')};
`;

const MessageLink = styled(ErrorDetailLink)`
  font-family: ${fontFamilyCode};
  font-size: ${fontSizes.large};
  ${truncate('100%')};
`;

const Culprit = styled.div`
  font-family: ${fontFamilyCode};
`;

interface Props {
  items: ErrorGroupListAPIResponse;
}

const ErrorGroupList: React.FC<Props> = (props) => {
  const { items } = props;
  const { urlParams } = useUrlParams();
  const { serviceName } = urlParams;

  if (!serviceName) {
    throw new Error('Service name is required');
  }
  const columns = useMemo(
    () => [
      {
        name: (
          <>
            {i18n.translate('xpack.apm.errorsTable.groupIdColumnLabel', {
              defaultMessage: 'Group ID',
            })}{' '}
            <EuiIconTip
              size="s"
              type="questionInCircle"
              color="subdued"
              iconProps={{
                className: 'eui-alignTop',
              }}
              content={i18n.translate(
                'xpack.apm.errorsTable.groupIdColumnDescription',
                {
                  defaultMessage:
                    'Hash of the stack trace. Groups similar errors together, even when the error message is different due to dynamic parameters.',
                }
              )}
            />
          </>
        ),
        field: 'groupId',
        sortable: false,
        width: px(unit * 6),
        render: (groupId: string) => {
          return (
            <GroupIdLink serviceName={serviceName} errorGroupId={groupId}>
              {groupId.slice(0, 5) || NOT_AVAILABLE_LABEL}
            </GroupIdLink>
          );
        },
      },
      {
        name: i18n.translate('xpack.apm.errorsTable.typeColumnLabel', {
          defaultMessage: 'Type',
        }),
        field: 'type',
        sortable: false,
        render: (type: string) => {
          return (
            <ErrorLink
              title={type}
              serviceName={serviceName}
              query={
                {
                  ...urlParams,
                  kuery: `error.exception.type:${type}`,
                } as APMQueryParams
              }
            >
              {type}
            </ErrorLink>
          );
        },
      },
      {
        name: i18n.translate(
          'xpack.apm.errorsTable.errorMessageAndCulpritColumnLabel',
          {
            defaultMessage: 'Error message and culprit',
          }
        ),
        field: 'message',
        sortable: false,
        width: '50%',
        render: (message: string, item: ErrorGroupListAPIResponse[0]) => {
          return (
            <MessageAndCulpritCell>
              <EuiToolTip
                id="error-message-tooltip"
                content={message || NOT_AVAILABLE_LABEL}
              >
                <MessageLink
                  serviceName={serviceName}
                  errorGroupId={item.groupId}
                >
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
        },
      },
      {
        name: '',
        field: 'handled',
        sortable: false,
        align: 'right',
        render: (isUnhandled: boolean) =>
          isUnhandled === false && (
            <EuiBadge color="warning">
              {i18n.translate('xpack.apm.errorsTable.unhandledLabel', {
                defaultMessage: 'Unhandled',
              })}
            </EuiBadge>
          ),
      },
      {
        name: i18n.translate('xpack.apm.errorsTable.occurrencesColumnLabel', {
          defaultMessage: 'Occurrences',
        }),
        field: 'occurrenceCount',
        sortable: true,
        dataType: 'number',
        render: (value?: number) =>
          value ? numeral(value).format('0.[0]a') : NOT_AVAILABLE_LABEL,
      },
      {
        field: 'latestOccurrenceAt',
        sortable: true,
        name: i18n.translate(
          'xpack.apm.errorsTable.latestOccurrenceColumnLabel',
          {
            defaultMessage: 'Latest occurrence',
          }
        ),
        align: 'right',
        render: (value?: number) =>
          value ? (
            <TimestampTooltip time={value} timeUnit="minutes" />
          ) : (
            NOT_AVAILABLE_LABEL
          ),
      },
    ],
    [serviceName, urlParams]
  );

  return (
    <ManagedTable
      noItemsMessage={i18n.translate('xpack.apm.errorsTable.noErrorsLabel', {
        defaultMessage: 'No errors were found',
      })}
      items={items}
      columns={columns}
      initialPageSize={25}
      initialSortField="occurrenceCount"
      initialSortDirection="desc"
      sortItems={false}
    />
  );
};

export { ErrorGroupList };
