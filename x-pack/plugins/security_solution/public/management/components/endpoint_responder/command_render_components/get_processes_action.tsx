/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import styled from 'styled-components';
import { EuiBasicTable, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ResponseActionFileDownloadLink } from '../../response_action_file_download_link';
import { KeyValueDisplay } from '../../key_value_display';
import { useConsoleActionSubmitter } from '../hooks/use_console_action_submitter';
import type {
  ActionDetails,
  GetProcessesActionOutputContent,
  MaybeImmutable,
  ProcessesRequestBody,
} from '../../../../../common/endpoint/types';
import { useSendGetEndpointProcessesRequest } from '../../../hooks/response_actions/use_send_get_endpoint_processes_request';
import type { ActionRequestComponentProps } from '../types';

// @ts-expect-error TS2769
const StyledEuiBasicTable = styled(EuiBasicTable)`
  table {
    background-color: transparent;
  }

  .euiTableHeaderCell {
    border-bottom: ${(props) => props.theme.eui.euiBorderThin};

    .euiTableCellContent__text {
      font-weight: ${(props) => props.theme.eui.euiFontWeightRegular};
    }
  }

  .euiTableRow {
    &:hover {
      background-color: ${({ theme: { eui } }) => eui.euiColorEmptyShade} !important;
    }

    .euiTableRowCell {
      border-top: none !important;
      border-bottom: none !important;
    }
  }
`;

export const GetProcessesActionResult = memo<ActionRequestComponentProps>(
  ({ command, setStore, store, status, setStatus, ResultComponent }) => {
    const { endpointId, agentType } = command.commandDefinition?.meta ?? {};
    const comment = command.args.args?.comment?.[0];
    const actionCreator = useSendGetEndpointProcessesRequest();

    const actionRequestBody = useMemo(() => {
      return endpointId
        ? {
            endpoint_ids: [endpointId],
            comment,
            agent_type: agentType,
          }
        : undefined;
    }, [endpointId, comment, agentType]);

    const { result, actionDetails: completedActionDetails } = useConsoleActionSubmitter<
      ProcessesRequestBody,
      GetProcessesActionOutputContent
    >({
      ResultComponent,
      setStore,
      store,
      status,
      setStatus,
      actionCreator,
      actionRequestBody,
      dataTestSubj: 'getProcesses',
    });

    if (!completedActionDetails || !completedActionDetails.wasSuccessful) {
      return result;
    }

    // Show results
    return (
      <ResultComponent data-test-subj="getProcessesSuccessCallout" showTitle={false}>
        {agentType === 'sentinel_one' ? (
          <SentinelOneRunningProcessesResults action={completedActionDetails} />
        ) : (
          <EndpointRunningProcessesResults action={completedActionDetails} agentId={endpointId} />
        )}
      </ResultComponent>
    );
  }
);
GetProcessesActionResult.displayName = 'GetProcessesActionResult';

interface EndpointRunningProcessesResultsProps {
  action: MaybeImmutable<ActionDetails<GetProcessesActionOutputContent>>;
  /** If defined, only the results for the given agent id will be displayed. Else, all agents output will be displayed */
  agentId?: string;
}

const EndpointRunningProcessesResults = memo<EndpointRunningProcessesResultsProps>(
  ({ action, agentId }) => {
    const agentIds: string[] = agentId ? [agentId] : [...action.agents];
    const columns = useMemo(
      () => [
        {
          field: 'user',
          'data-test-subj': 'process_list_user',
          name: i18n.translate(
            'xpack.securitySolution.endpointResponseActions.getProcesses.table.header.user',
            { defaultMessage: 'USER' }
          ),
          width: '10%',
        },
        {
          field: 'pid',
          'data-test-subj': 'process_list_pid',
          name: i18n.translate(
            'xpack.securitySolution.endpointResponseActions.getProcesses.table.header.pid',
            { defaultMessage: 'PID' }
          ),
          width: '5%',
        },
        {
          field: 'entity_id',
          'data-test-subj': 'process_list_entity_id',
          name: i18n.translate(
            'xpack.securitySolution.endpointResponseActions.getProcesses.table.header.enityId',
            { defaultMessage: 'ENTITY ID' }
          ),
          width: '30%',
        },

        {
          field: 'command',
          'data-test-subj': 'process_list_command',
          name: i18n.translate(
            'xpack.securitySolution.endpointResponseActions.getProcesses.table.header.command',
            { defaultMessage: 'COMMAND' }
          ),
          width: '55%',
        },
      ],
      []
    );

    return (
      <>
        {agentIds.length > 1 ? (
          agentIds.map((id) => {
            const hostName = action.hosts[id].name;

            return (
              <div key={hostName}>
                <KeyValueDisplay
                  name={hostName}
                  value={
                    <StyledEuiBasicTable
                      data-test-subj={'getProcessListTable'}
                      items={action.outputs?.[id]?.content.entries ?? []}
                      columns={columns}
                    />
                  }
                />
                <EuiSpacer />
              </div>
            );
          })
        ) : (
          <StyledEuiBasicTable
            data-test-subj={'getProcessListTable'}
            items={action.outputs?.[agentIds[0]]?.content.entries ?? []}
            columns={columns}
          />
        )}
      </>
    );
  }
);
EndpointRunningProcessesResults.displayName = 'EndpointRunningProcessesResults';

interface SentinelOneRunningProcessesResultsProps {
  action: MaybeImmutable<ActionDetails<GetProcessesActionOutputContent>>;
  /**
   * If defined, the results will only be displayed for the given agent id.
   * If undefined, then responses for all agents are displayed
   */
  agentId?: string;
}

const SentinelOneRunningProcessesResults = memo<SentinelOneRunningProcessesResultsProps>(
  ({ action, agentId }) => {
    const agentIds = agentId ? [agentId] : action.agents;

    return (
      <>
        {agentIds.length === 1 ? (
          <ResponseActionFileDownloadLink action={action} canAccessFileDownloadLink={true} />
        ) : (
          agentIds.map((id) => {
            return (
              <div key={id}>
                <KeyValueDisplay
                  name={action.hosts[id].name}
                  value={
                    <ResponseActionFileDownloadLink
                      action={action}
                      agentId={id}
                      canAccessFileDownloadLink={true}
                    />
                  }
                />
              </div>
            );
          })
        )}
      </>
    );
  }
);
SentinelOneRunningProcessesResults.displayName = 'SentinelOneRunningProcessesResults';
