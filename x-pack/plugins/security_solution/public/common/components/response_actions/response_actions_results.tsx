/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import type { LogsOsqueryAction } from '@kbn/osquery-plugin/common/types/osquery_action';
import type { Ecs } from '@kbn/cases-plugin/common';
import { EuiComment, EuiSpacer, EuiAvatar, EuiBasicTable } from '@elastic/eui';
import { FormattedRelative } from '@kbn/i18n-react';
import { useSubAction } from '../../../timelines/components/side_panel/event_details/flyout/use_sub_action';
import SentinelLogo from './logo';
import { EndpointResponseActionResults } from './endpoint_action_results';
import type {
  LogsEndpointAction,
  LogsEndpointActionWithHosts,
} from '../../../../common/endpoint/types';
import { useKibana } from '../../lib/kibana';

interface ResponseActionsResultsProps {
  actions: Array<LogsEndpointActionWithHosts | LogsOsqueryAction>;
  ruleName?: string;
  ecsData?: Ecs | null;
}

const SentinelOneScriptStatus = ({
  connectorId = 'f5a8df50-08fc-11ee-9bf3-f3eed5c98bfd',
  parentTaskId,
}) => {
  console.error('parentTaskId', parentTaskId);

  const subActionResults = useSubAction({
    connectorId,
    subAction: 'getRemoteScriptStatus',
    subActionParams: {
      parentTaskId,
    },
  });

  console.error('subActionResults', subActionResults);

  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [showPerPageOptions, setShowPerPageOptions] = useState(true);

  const onTableChange = ({ page }: Criteria<User>) => {
    if (page) {
      const { index: pageIndex, size: pageSize } = page;
      setPageIndex(pageIndex);
      setPageSize(pageSize);
    }
  };

  const pagination = {
    pageIndex,
    pageSize,
    totalItemCount: subActionResults?.data?.data?.pagination?.totalItems ?? 0,
    pageSizeOptions: [10, 0],
    showPerPageOptions,
  };

  const columns = [
    {
      field: 'description',
      name: 'Description',
    },
    {
      field: 'agentComputerName',
      name: 'Target',
    },
    {
      field: 'status',
      name: 'Status',
    },
    {
      field: 'detailedStatus',
      name: 'Detailed Status',
    },
  ];

  return (
    <EuiBasicTable
      tableCaption="Demo for EuiBasicTable with pagination"
      items={subActionResults?.data?.data?.data ?? []}
      columns={columns}
      pagination={pagination}
      onChange={onTableChange}
    />
  );
};

export const ResponseActionsResults = React.memo(
  ({ actions, ruleName, ecsData }: ResponseActionsResultsProps) => {
    const {
      services: { osquery },
    } = useKibana();
    const { OsqueryResult } = osquery;

    const getAction = useCallback(
      (action: LogsEndpointActionWithHosts | LogsOsqueryAction) => {
        if (isOsquery(action)) {
          const actionId = action.action_id;
          const startDate = action['@timestamp'];

          return (
            <OsqueryResult
              key={actionId}
              actionId={actionId}
              startDate={startDate}
              ruleName={ruleName}
              ecsData={ecsData}
            />
          );
        }
        if (isEndpoint(action)) {
          return (
            <EndpointResponseActionResults
              action={action}
              ruleName={ruleName}
              key={action.EndpointActions.action_id}
            />
          );
        }
        if (action.message.includes('.sentinelone')) {
          const actionData = action.source.kibana.action.execution.sentinelone;
          let event;
          if (actionData.params.subAction === 'killProcess') {
            event = (
              <>
                {'Terminated process '}
                <b>{actionData.params.subActionParams.processName}</b>
                {' on host '}
                <b>{actionData.params.subActionParams.hostname}</b>
              </>
            );
          } else if (actionData.params.subAction === 'isolateAgent') {
            event = (
              <>
                {'Isolated host '}
                <b>{actionData.params.subActionParams.hostname}</b>
              </>
            );
          } else if (actionData.params.subAction === 'releaseAgent') {
            event = (
              <>
                {'Released host '}
                <b>{actionData.params.subActionParams.hostname}</b>
              </>
            );
          } else {
            event = (
              <>
                {`Executed action `}
                <b>{actionData.params.subAction}</b>
              </>
            );
          }

          return (
            <EuiComment
              username={'sentinelone'}
              timestamp={<FormattedRelative value={action['@timestamp']} />}
              event={event}
              data-test-subj={'endpoint-results-comment'}
              timelineAvatar={
                <EuiAvatar
                  name="sentinelone"
                  iconType={SentinelLogo}
                  color="subdued"
                  css={{ padding: 8 }}
                />
              }
            >
              {!['isolateAgent', 'releaseAgent'].includes(actionData.params.subAction) && (
                <SentinelOneScriptStatus parentTaskId={actionData.data.data.parentTaskId} />
              )}
            </EuiComment>
          );
        }
        return null;
      },
      [OsqueryResult, ecsData, ruleName]
    );

    return (
      <>
        {actions.map((action) => {
          return (
            <>
              <EuiSpacer size="s" />
              {getAction(action)}
              <EuiSpacer size="s" />
            </>
          );
        })}
      </>
    );
  }
);

ResponseActionsResults.displayName = 'ResponseActionsResults';

const isOsquery = (item: LogsEndpointAction | LogsOsqueryAction): item is LogsOsqueryAction => {
  return item && 'input_type' in item && item?.input_type === 'osquery';
};
const isEndpoint = (item: LogsEndpointAction | LogsOsqueryAction): item is LogsEndpointAction => {
  return item && 'EndpointActions' in item && item?.EndpointActions.input_type === 'endpoint';
};
