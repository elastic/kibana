/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import styled from 'styled-components';
import { EuiBasicTable } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useConsoleActionSubmitter } from '../hooks/use_console_action_submitter';
import type {
  GetProcessesActionOutputContent,
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
    const endpointId = command.commandDefinition?.meta?.endpointId;
    const actionCreator = useSendGetEndpointProcessesRequest();

    const actionRequestBody = useMemo(() => {
      return endpointId
        ? {
            endpoint_ids: [endpointId],
            comment: command.args.args?.comment?.[0],
          }
        : undefined;
    }, [endpointId, command.args.args?.comment]);

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

    const tableEntries = useMemo(() => {
      if (endpointId) {
        return completedActionDetails?.outputs?.[endpointId]?.content.entries ?? [];
      }
      return [];
    }, [completedActionDetails?.outputs, endpointId]);

    if (!completedActionDetails || !completedActionDetails.wasSuccessful) {
      return result;
    }

    // Show results
    return (
      <ResultComponent data-test-subj="getProcessesSuccessCallout" showTitle={false}>
        <StyledEuiBasicTable
          data-test-subj={'getProcessListTable'}
          items={[...tableEntries]}
          columns={columns}
        />
      </ResultComponent>
    );
  }
);
GetProcessesActionResult.displayName = 'GetProcessesActionResult';
