/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback, useMemo, useState } from 'react';

import {
  EuiI18nNumber,
  EuiAvatar,
  EuiButtonIcon,
  EuiCodeBlock,
  EuiDescriptionList,
  EuiFacetButton,
  EuiFlexGroup,
  EuiFlexItem,
  RIGHT_ALIGNMENT,
  EuiScreenReaderOnly,
  EuiText,
  EuiToolTip,
  type HorizontalAlignment,
} from '@elastic/eui';
import { css, euiStyled } from '@kbn/kibana-react-plugin/common';
import { FormattedMessage } from '@kbn/i18n-react';

import type { ActionListApiResponse } from '../../../../common/endpoint/types';
import type { EndpointActionListRequestQuery } from '../../../../common/endpoint/schema/actions';
import { FormattedDate } from '../../../common/components/formatted_date';
import { OUTPUT_MESSAGES, TABLE_COLUMN_NAMES, UX_MESSAGES } from './translations';
import { getActionStatus, getUiCommand } from './components/hooks';
import { getEmptyValue } from '../../../common/components/empty_value';
import { StatusBadge } from './components/status_badge';
import { useTestIdGenerator } from '../../hooks/use_test_id_generator';
import { MANAGEMENT_PAGE_SIZE_OPTIONS } from '../../common/constants';
import { ResponseActionFileDownloadLink } from '../response_action_file_download_link';

const emptyValue = getEmptyValue();

// Truncated usernames
const StyledFacetButton = euiStyled(EuiFacetButton)`
  .euiText {
    margin-top: 0.38rem;
    overflow-y: visible !important;
  }
`;

const customDescriptionListCss = css`
  &.euiDescriptionList {
    > .euiDescriptionList__title {
      color: ${(props) => props.theme.eui.euiColorDarkShade};
      font-size: ${(props) => props.theme.eui.euiFontSizeXS};
    }

    > .euiDescriptionList__title,
    > .euiDescriptionList__description {
      font-weight: ${(props) => props.theme.eui.euiFontWeightRegular};
      margin-top: ${(props) => props.theme.eui.euiSizeS};
    }
  }
`;

const StyledDescriptionList = euiStyled(EuiDescriptionList).attrs({
  compressed: true,
  type: 'column',
})`
  ${customDescriptionListCss}
`;

// output section styles
const topSpacingCss = css`
  ${(props) => `${props.theme.eui.euiSize} 0`}
`;
const dashedBorderCss = css`
  ${(props) => `1px dashed ${props.theme.eui.euiColorDisabled}`};
`;
const StyledDescriptionListOutput = euiStyled(EuiDescriptionList).attrs({ compressed: true })`
  ${customDescriptionListCss}
  dd {
    margin: ${topSpacingCss};
    padding: ${topSpacingCss};
    border-top: ${dashedBorderCss};
    border-bottom: ${dashedBorderCss};
  }
`;

// code block styles
const StyledEuiCodeBlock = euiStyled(EuiCodeBlock).attrs({
  transparentBackground: true,
  paddingSize: 'none',
})`
  code {
    color: ${(props) => props.theme.eui.euiColorDarkShade} !important;
  }
`;

export const useResponseActionsLogTable = ({
  pageIndex,
  pageSize,
  queryParams,
  showHostNames,
  totalItemCount,
}: {
  pageIndex: number;
  pageSize: number;
  queryParams: EndpointActionListRequestQuery;
  showHostNames: boolean;
  totalItemCount: number;
}) => {
  const getTestId = useTestIdGenerator('response-actions-list');

  const [itemIdToExpandedRowMap, setItemIdToExpandedRowMap] = useState<{
    [k: ActionListApiResponse['data'][number]['id']]: React.ReactNode;
  }>({});

  // expanded tray contents
  const toggleDetails = useCallback(
    (item: ActionListApiResponse['data'][number]) => {
      const itemIdToExpandedRowMapValues = { ...itemIdToExpandedRowMap };
      if (itemIdToExpandedRowMapValues[item.id]) {
        delete itemIdToExpandedRowMapValues[item.id];
      } else {
        const {
          startedAt,
          completedAt,
          isCompleted,
          wasSuccessful,
          isExpired,
          command: _command,
          comment,
          parameters,
        } = item;

        const parametersList = parameters
          ? Object.entries(parameters).map(([key, value]) => {
              return `${key}:${value}`;
            })
          : undefined;

        const command = getUiCommand(_command);
        const isGetFileCommand = command === 'get-file';
        const dataList = [
          {
            title: OUTPUT_MESSAGES.expandSection.placedAt,
            description: `${startedAt}`,
          },
          {
            title: OUTPUT_MESSAGES.expandSection.startedAt,
            description: `${startedAt}`,
          },
          {
            title: OUTPUT_MESSAGES.expandSection.completedAt,
            description: `${completedAt ?? emptyValue}`,
          },
          {
            title: OUTPUT_MESSAGES.expandSection.input,
            description: `${command}`,
          },
          {
            title: OUTPUT_MESSAGES.expandSection.parameters,
            description: parametersList ? parametersList : emptyValue,
          },
          {
            title: OUTPUT_MESSAGES.expandSection.comment,
            description: comment ? comment : emptyValue,
          },
        ].map(({ title, description }) => {
          return {
            title: <StyledEuiCodeBlock>{title}</StyledEuiCodeBlock>,
            description: <StyledEuiCodeBlock>{description}</StyledEuiCodeBlock>,
          };
        });

        const getOutputContent = () => {
          if (isExpired) {
            return OUTPUT_MESSAGES.hasExpired(command);
          }

          if (!isCompleted) {
            return OUTPUT_MESSAGES.isPending(command);
          }

          if (!wasSuccessful) {
            return OUTPUT_MESSAGES.hasFailed(command);
          }

          if (isGetFileCommand) {
            return (
              <>
                {OUTPUT_MESSAGES.wasSuccessful(command)}
                <ResponseActionFileDownloadLink
                  action={item}
                  textSize="xs"
                  data-test-subj={getTestId('getFileDownloadLink')}
                />
              </>
            );
          }

          return OUTPUT_MESSAGES.wasSuccessful(command);
        };

        const outputList = [
          {
            title: (
              <StyledEuiCodeBlock>{`${OUTPUT_MESSAGES.expandSection.output}:`}</StyledEuiCodeBlock>
            ),
            description: (
              // codeblock for output
              <StyledEuiCodeBlock data-test-subj={getTestId('details-tray-output')}>
                {getOutputContent()}
              </StyledEuiCodeBlock>
            ),
          },
        ];

        itemIdToExpandedRowMapValues[item.id] = (
          <>
            <EuiFlexGroup
              data-test-subj={getTestId('details-tray')}
              direction="column"
              style={{ maxHeight: 270, overflowY: 'auto' }}
              className="eui-yScrollWithShadows"
              gutterSize="s"
            >
              <EuiFlexItem grow={false}>
                <StyledDescriptionList listItems={dataList} />
              </EuiFlexItem>
              <EuiFlexItem>
                <StyledDescriptionListOutput listItems={outputList} />
              </EuiFlexItem>
            </EuiFlexGroup>
          </>
        );
      }
      setItemIdToExpandedRowMap(itemIdToExpandedRowMapValues);
    },
    [getTestId, itemIdToExpandedRowMap]
  );
  // memoized callback for toggleDetails
  const onClickCallback = useCallback(
    (actionListDataItem: ActionListApiResponse['data'][number]) => () =>
      toggleDetails(actionListDataItem),
    [toggleDetails]
  );

  const responseActionListColumns = useMemo(() => {
    const columns = [
      {
        field: 'startedAt',
        name: TABLE_COLUMN_NAMES.time,
        width: !showHostNames ? '21%' : '15%',
        truncateText: true,
        render: (startedAt: ActionListApiResponse['data'][number]['startedAt']) => {
          return (
            <FormattedDate
              fieldName={TABLE_COLUMN_NAMES.time}
              value={startedAt}
              className="eui-textTruncate"
            />
          );
        },
      },
      {
        field: 'command',
        name: TABLE_COLUMN_NAMES.command,
        width: !showHostNames ? '21%' : '10%',
        truncateText: true,
        render: (_command: ActionListApiResponse['data'][number]['command']) => {
          const command = getUiCommand(_command);
          return (
            <EuiToolTip content={command} anchorClassName="eui-textTruncate">
              <EuiText
                size="s"
                className="eui-textTruncate eui-fullWidth"
                data-test-subj={getTestId('column-command')}
              >
                {command}
              </EuiText>
            </EuiToolTip>
          );
        },
      },
      {
        field: 'createdBy',
        name: TABLE_COLUMN_NAMES.user,
        width: !showHostNames ? '21%' : '14%',
        truncateText: true,
        render: (userId: ActionListApiResponse['data'][number]['createdBy']) => {
          return (
            <StyledFacetButton
              icon={
                <EuiAvatar
                  // this will be not needed, I just messed up database actions by not providing user
                  name={userId ?? 'elastic'}
                  data-test-subj={getTestId('column-user-avatar')}
                  size="s"
                />
              }
            >
              <EuiToolTip content={userId} anchorClassName="eui-textTruncate">
                <EuiText
                  size="s"
                  className="eui-textTruncate eui-fullWidth"
                  data-test-subj={getTestId('column-user-name')}
                >
                  {userId}
                </EuiText>
              </EuiToolTip>
            </StyledFacetButton>
          );
        },
      },
      // conditional hostnames column
      {
        field: 'hosts',
        name: TABLE_COLUMN_NAMES.hosts,
        width: '20%',
        truncateText: true,
        render: (_hosts: ActionListApiResponse['data'][number]['hosts']) => {
          const hosts = _hosts && Object.values(_hosts);
          // join hostnames if the action is for multiple agents
          // and skip empty strings for names if any
          const _hostnames = hosts
            .reduce<string[]>((acc, host) => {
              if (host.name.trim()) {
                acc.push(host.name);
              }
              return acc;
            }, [])
            .join(', ');

          let hostnames = _hostnames;
          if (!_hostnames) {
            if (hosts.length > 1) {
              // when action was for a single agent and no host name
              hostnames = UX_MESSAGES.unenrolled.hosts;
            } else if (hosts.length === 1) {
              // when action was for a multiple agents
              // and none of them have a host name
              hostnames = UX_MESSAGES.unenrolled.host;
            }
          }
          return (
            <EuiToolTip content={hostnames} anchorClassName="eui-textTruncate">
              <EuiText
                size="s"
                className="eui-textTruncate eui-fullWidth"
                data-test-subj={getTestId('column-hostname')}
              >
                {hostnames}
              </EuiText>
            </EuiToolTip>
          );
        },
      },
      {
        field: 'comment',
        name: TABLE_COLUMN_NAMES.comments,
        width: !showHostNames ? '21%' : '30%',
        truncateText: true,
        render: (comment: ActionListApiResponse['data'][number]['comment']) => {
          return (
            <EuiToolTip content={comment} anchorClassName="eui-textTruncate">
              <EuiText
                size="s"
                className="eui-textTruncate eui-fullWidth"
                data-test-subj={getTestId('column-comments')}
              >
                {comment ?? emptyValue}
              </EuiText>
            </EuiToolTip>
          );
        },
      },
      {
        field: 'status',
        name: TABLE_COLUMN_NAMES.status,
        width: !showHostNames ? '15%' : '10%',
        render: (_status: ActionListApiResponse['data'][number]['status']) => {
          const status = getActionStatus(_status);

          return (
            <EuiToolTip content={status} anchorClassName="eui-textTruncate">
              <StatusBadge
                color={
                  _status === 'failed' ? 'danger' : _status === 'successful' ? 'success' : 'warning'
                }
                status={status}
              />
            </EuiToolTip>
          );
        },
      },
      {
        field: '',
        align: RIGHT_ALIGNMENT as HorizontalAlignment,
        width: '40px',
        isExpander: true,
        name: (
          <EuiScreenReaderOnly>
            <span>{UX_MESSAGES.screenReaderExpand}</span>
          </EuiScreenReaderOnly>
        ),
        render: (actionListDataItem: ActionListApiResponse['data'][number]) => {
          return (
            <EuiButtonIcon
              data-test-subj={getTestId('expand-button')}
              onClick={onClickCallback(actionListDataItem)}
              aria-label={itemIdToExpandedRowMap[actionListDataItem.id] ? 'Collapse' : 'Expand'}
              iconType={itemIdToExpandedRowMap[actionListDataItem.id] ? 'arrowUp' : 'arrowDown'}
            />
          );
        },
      },
    ];
    // filter out the `hosts` column
    // if showHostNames is FALSE
    if (!showHostNames) {
      return columns.filter((column) => column.field !== 'hosts');
    }
    return columns;
  }, [showHostNames, getTestId, itemIdToExpandedRowMap, onClickCallback]);

  // table pagination
  const tablePagination = useMemo(() => {
    return {
      pageIndex,
      pageSize,
      totalItemCount,
      pageSizeOptions: MANAGEMENT_PAGE_SIZE_OPTIONS as number[],
    };
  }, [pageIndex, pageSize, totalItemCount]);

  // compute record ranges
  const pagedResultsCount = useMemo(() => {
    const page = queryParams.page ?? 1;
    const perPage = queryParams?.pageSize ?? 10;

    const totalPages = Math.ceil(totalItemCount / perPage);
    const fromCount = perPage * page - perPage + 1;
    const toCount =
      page === totalPages || totalPages === 1 ? totalItemCount : fromCount + perPage - 1;
    return { fromCount, toCount };
  }, [queryParams.page, queryParams.pageSize, totalItemCount]);

  // create range label to display
  const recordRangeLabel = useMemo(
    () => (
      <EuiText color="default" size="xs" data-test-subj={getTestId('endpointListTableTotal')}>
        <FormattedMessage
          id="xpack.securitySolution.responseActionsList.list.recordRange"
          defaultMessage="Showing {range} of {total} {recordsLabel}"
          values={{
            range: (
              <strong>
                <EuiI18nNumber value={pagedResultsCount.fromCount} />
                {'-'}
                <EuiI18nNumber value={pagedResultsCount.toCount} />
              </strong>
            ),
            total: <EuiI18nNumber value={totalItemCount} />,
            recordsLabel: <strong>{UX_MESSAGES.recordsLabel(totalItemCount)}</strong>,
          }}
        />
      </EuiText>
    ),
    [getTestId, pagedResultsCount.fromCount, pagedResultsCount.toCount, totalItemCount]
  );

  return { itemIdToExpandedRowMap, responseActionListColumns, recordRangeLabel, tablePagination };
};
