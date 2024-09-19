/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBadge,
  EuiIconTip,
  EuiToolTip,
  RIGHT_ALIGNMENT,
} from '@elastic/eui';
import numeral from '@elastic/numeral';
import { i18n } from '@kbn/i18n';
import React, { useMemo } from 'react';
import { euiStyled } from '../../../../../../../../src/plugins/kibana_react/common';
import { NOT_AVAILABLE_LABEL } from '../../../../../common/i18n';
import { useUrlParams } from '../../../../context/url_params_context/use_url_params';
import { APIReturnType } from '../../../../services/rest/createCallApmApi';
import { truncate, unit } from '../../../../utils/style';
import { ErrorDetailLink } from '../../../shared/Links/apm/ErrorDetailLink';
import { ErrorOverviewLink } from '../../../shared/Links/apm/ErrorOverviewLink';
import { APMQueryParams } from '../../../shared/Links/url_helpers';
import { ITableColumn, ManagedTable } from '../../../shared/managed_table';
import { TimestampTooltip } from '../../../shared/TimestampTooltip';

const GroupIdLink = euiStyled(ErrorDetailLink)`
  font-family: ${({ theme }) => theme.eui.euiCodeFontFamily};
`;

const MessageAndCulpritCell = euiStyled.div`
  ${truncate('100%')};
`;

const ErrorLink = euiStyled(ErrorOverviewLink)`
  ${truncate('100%')};
`;

const MessageLink = euiStyled(ErrorDetailLink)`
  font-family: ${({ theme }) => theme.eui.euiCodeFontFamily};
  font-size: ${({ theme }) => theme.eui.euiFontSizeM};
  ${truncate('100%')};
`;

const Culprit = euiStyled.div`
  font-family: ${({ theme }) => theme.eui.euiCodeFontFamily};
`;

type ErrorGroupItem =
  APIReturnType<'GET /api/apm/services/{serviceName}/errors'>['errorGroups'][0];

interface Props {
  items: ErrorGroupItem[];
  serviceName: string;
}

function ErrorGroupList({ items, serviceName }: Props) {
  const { urlParams } = useUrlParams();

  const columns = useMemo(() => {
    return [
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
        width: `${unit * 6}px`,
        render: (_, { groupId }) => {
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
        render: (_, { type }) => {
          return (
            <ErrorLink
              title={type}
              serviceName={serviceName}
              query={
                {
                  ...urlParams,
                  kuery: `error.exception.type:"${type}"`,
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
        render: (_, item: ErrorGroupItem) => {
          return (
            <MessageAndCulpritCell>
              <EuiToolTip
                id="error-message-tooltip"
                content={item.message || NOT_AVAILABLE_LABEL}
              >
                <MessageLink
                  serviceName={serviceName}
                  errorGroupId={item.groupId}
                >
                  {item.message || NOT_AVAILABLE_LABEL}
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
        align: RIGHT_ALIGNMENT,
        render: (_, { handled }) =>
          handled === false && (
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
        render: (_, { occurrenceCount }) =>
          occurrenceCount
            ? numeral(occurrenceCount).format('0.[0]a')
            : NOT_AVAILABLE_LABEL,
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
        align: RIGHT_ALIGNMENT,
        render: (_, { latestOccurrenceAt }) =>
          latestOccurrenceAt ? (
            <TimestampTooltip time={latestOccurrenceAt} timeUnit="minutes" />
          ) : (
            NOT_AVAILABLE_LABEL
          ),
      },
    ] as Array<ITableColumn<ErrorGroupItem>>;
  }, [serviceName, urlParams]);

  return (
    <ManagedTable
      noItemsMessage={i18n.translate('xpack.apm.errorsTable.noErrorsLabel', {
        defaultMessage: 'No errors found',
      })}
      items={items}
      columns={columns}
      initialPageSize={25}
      initialSortField="occurrenceCount"
      initialSortDirection="desc"
      sortItems={false}
    />
  );
}

export { ErrorGroupList };
