/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useEffect, useMemo } from 'react';
import styled from 'styled-components';
import { EuiBasicTable } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { ActionDetails, RunningProcessesEntry } from '../../../../common/endpoint/types';
import { useGetActionDetails } from '../../hooks/endpoint/use_get_action_details';
import { EndpointCommandDefinitionMeta } from './types';
import { CommandExecutionComponentProps } from '../console/types';
import { useSendGetEndpointRunningProcessesRequest } from '../../hooks/endpoint/use_send_get_endpoint_running_processes_request';

// @ts-expect-error TS2769
const StyledEuiBasicTable = styled(EuiBasicTable)`
  table {
    background-color: ${({ theme: { eui } }) => eui.euiPageBackgroundColor};
  }
  .euiTableHeaderCell {
    border-bottom: ${(props) => props.theme.eui.euiBorderThin};
    .euiTableCellContent__text {
      font-weight: 400;
    }
  }
  .euiTableRow {
    &:hover {
      background-color: white !important;
    }
    .euiTableRowCell {
      border-top: none !important;
      border-bottom: none !important;
    }
  }
`;

export const GetRunningProcessesActionResult = memo<
  CommandExecutionComponentProps<
    { comment?: string },
    {
      actionId?: string;
      actionRequestSent?: boolean;
      completedActionDetails?: ActionDetails<RunningProcessesEntry>;
    },
    EndpointCommandDefinitionMeta
  >
>(({ command, setStore, store, status, setStatus, ResultComponent }) => {
  const endpointId = command.commandDefinition?.meta?.endpointId;
  const { actionId, completedActionDetails } = store;

  const isPending = status === 'pending';
  const actionRequestSent = Boolean(store.actionRequestSent);

  const getRunningProcessesApi = useSendGetEndpointRunningProcessesRequest();

  const { data: actionDetails } = useGetActionDetails<RunningProcessesEntry>(actionId ?? '-', {
    enabled: Boolean(actionId) && isPending,
    refetchInterval: isPending ? 3000 : false,
  });

  // Send get running processes request if not yet done
  useEffect(() => {
    if (!actionRequestSent && endpointId) {
      getRunningProcessesApi.mutate({
        endpoint_ids: [endpointId],
        comment: command.args.args?.comment?.[0],
      });

      setStore((prevState) => {
        return { ...prevState, actionRequestSent: true };
      });
    }
  }, [actionRequestSent, command.args.args?.comment, endpointId, getRunningProcessesApi, setStore]);

  // If get running processes request was created, store the action id if necessary
  useEffect(() => {
    if (getRunningProcessesApi.isSuccess && actionId !== getRunningProcessesApi.data.data.id) {
      setStore((prevState) => {
        return { ...prevState, actionId: getRunningProcessesApi.data.data.id };
      });
    } else {
      setStore((prevState) => {
        if (prevState.completedActionDetails) {
          return {
            ...prevState,
            completedActionDetails: {
              ...prevState.completedActionDetails,
              isCompleted: true,
              errors: [getRunningProcessesApi.error?.message ?? ''],
            },
          };
        }
        return prevState;
      });
    }
  }, [
    actionId,
    getRunningProcessesApi.data?.data.id,
    getRunningProcessesApi.error,
    getRunningProcessesApi.isSuccess,
    setStore,
  ]);

  useEffect(() => {
    if (actionDetails?.data.isCompleted) {
      setStatus('success');
      setStore((prevState) => {
        return {
          ...prevState,
          completedActionDetails: actionDetails?.data,
        };
      });
    }
  }, [actionDetails?.data, setStatus, setStore]);

  const columns = useMemo(
    () => [
      {
        field: 'user',
        name: i18n.translate(
          'xpack.securitySolution.endpointResponseActions.getRunningProcesses.table.header.user',
          { defaultMessage: 'USER' }
        ),
        width: '10%',
      },
      {
        field: 'pid',
        name: i18n.translate(
          'xpack.securitySolution.endpointResponseActions.getRunningProcesses.table.header.pid',
          { defaultMessage: 'PID' }
        ),
        width: '5%',
      },
      {
        field: 'entity_id',
        name: i18n.translate(
          'xpack.securitySolution.endpointResponseActions.getRunningProcesses.table.header.enityId',
          { defaultMessage: 'ENTITY ID' }
        ),
        width: '30%',
      },

      {
        field: 'command',
        name: i18n.translate(
          'xpack.securitySolution.endpointResponseActions.getRunningProcesses.table.header.command',
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

  // Show nothing if still pending
  if (isPending) {
    return <ResultComponent showAs="pending" showTitle={false} />;
  }

  // Show errors
  if (completedActionDetails?.errors) {
    return (
      <ResultComponent
        showAs="failure"
        title={i18n.translate(
          'xpack.securitySolution.endpointResponseActions.getRunningProcesses.errorMessageTitle',
          { defaultMessage: 'Get running processes action failed' }
        )}
        data-test-subj="getRunningProcessesErrorCallout"
      >
        <FormattedMessage
          id="xpack.securitySolution.endpointResponseActions.getRunningProcesses.errorMessage"
          defaultMessage="The following errors were encountered: {errors}"
          values={{ errors: completedActionDetails.errors.join(' | ') }}
        />
      </ResultComponent>
    );
  }

  // Show results
  return (
    <ResultComponent data-test-subj="getRunningProcessesSuccessCallout" showTitle={false}>
      <StyledEuiBasicTable items={[...tableEntries]} columns={columns} />
    </ResultComponent>
  );
});
GetRunningProcessesActionResult.displayName = 'GetRunningProcessesActionResult';
