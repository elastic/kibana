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
import { HttpFetchError } from '@kbn/core/public';
import { FormattedMessage } from '@kbn/i18n-react';
import { ActionDetails, ProcessesEntry } from '../../../../common/endpoint/types';
import { useGetActionDetails } from '../../hooks/endpoint/use_get_action_details';
import { EndpointCommandDefinitionMeta } from './types';
import { CommandExecutionComponentProps } from '../console/types';
import { useSendGetEndpointProcessesRequest } from '../../hooks/endpoint/use_send_get_endpoint_processes_request';
import { ActionError } from './action_error';

// @ts-expect-error TS2769
const StyledEuiBasicTable = styled(EuiBasicTable)`
  table {
    background-color: ${({ theme: { eui } }) => eui.euiPageBackgroundColor};
  }
  .euiTableHeaderCell {
    border-bottom: ${(props) => props.theme.eui.euiBorderThin};
    .euiTableCellContent__text {
      font-weight: ${(props) => props.theme.eui.euiFontWeightRegular};
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

export const GetProcessesActionResult = memo<
  CommandExecutionComponentProps<
    { comment?: string },
    {
      actionId?: string;
      actionRequestSent?: boolean;
      completedActionDetails?: ActionDetails<ProcessesEntry>;
      apiError?: HttpFetchError;
    },
    EndpointCommandDefinitionMeta
  >
>(({ command, setStore, store, status, setStatus, ResultComponent }) => {
  const endpointId = command.commandDefinition?.meta?.endpointId;
  const { actionId, completedActionDetails, apiError } = store;

  const isPending = status === 'pending';
  const isError = status === 'error';
  const actionRequestSent = Boolean(store.actionRequestSent);

  const {
    mutate: getProcesses,
    data: getProcessesData,
    isSuccess: isGetProcessesSuccess,
    error: getProcessesError,
  } = useSendGetEndpointProcessesRequest();

  const { data: actionDetails } = useGetActionDetails<ProcessesEntry>(actionId ?? '-', {
    enabled: Boolean(actionId) && isPending,
    refetchInterval: isPending ? 3000 : false,
  });

  // Send get processes request if not yet done
  useEffect(() => {
    if (!actionRequestSent && endpointId) {
      getProcesses({
        endpoint_ids: [endpointId],
        comment: command.args.args?.comment?.[0],
      });

      setStore((prevState) => {
        return { ...prevState, actionRequestSent: true };
      });
    }
  }, [actionRequestSent, command.args.args?.comment, endpointId, getProcesses, setStore]);

  // If get processes request was created, store the action id if necessary
  useEffect(() => {
    if (isGetProcessesSuccess && actionId !== getProcessesData?.data.id) {
      setStore((prevState) => {
        return { ...prevState, actionId: getProcessesData?.data.id };
      });
    } else if (getProcessesError) {
      setStatus('error');
      setStore((prevState) => {
        return { ...prevState, apiError: getProcessesError };
      });
    }
  }, [
    actionId,
    getProcessesData?.data.id,
    getProcessesError,
    isGetProcessesSuccess,
    setStatus,
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
          'xpack.securitySolution.endpointResponseActions.getProcesses.table.header.user',
          { defaultMessage: 'USER' }
        ),
        width: '10%',
      },
      {
        field: 'pid',
        name: i18n.translate(
          'xpack.securitySolution.endpointResponseActions.getProcesses.table.header.pid',
          { defaultMessage: 'PID' }
        ),
        width: '5%',
      },
      {
        field: 'entity_id',
        name: i18n.translate(
          'xpack.securitySolution.endpointResponseActions.getProcesses.table.header.enityId',
          { defaultMessage: 'ENTITY ID' }
        ),
        width: '30%',
      },

      {
        field: 'command',
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

  // Show nothing if still pending
  if (isPending) {
    return <ResultComponent showAs="pending" showTitle={false} />;
  }

  // Show errors if perform action fails
  if (isError && apiError) {
    return (
      <ResultComponent
        showAs="failure"
        title={i18n.translate(
          'xpack.securitySolution.endpointResponseActions.getProcesses.performApiErrorMessageTitle',
          { defaultMessage: 'Perform get processes action failed' }
        )}
        data-test-subj="performGetProcessesErrorCallout"
      >
        <FormattedMessage
          id="xpack.securitySolution.endpointResponseActions.getProcesses.performApiErrorMessage"
          defaultMessage="The following error was encountered: {error}"
          values={{ error: apiError.message }}
        />
      </ResultComponent>
    );
  }

  // Show errors
  if (completedActionDetails?.errors) {
    return (
      <ActionError
        title={i18n.translate(
          'xpack.securitySolution.endpointResponseActions.getProcesses.errorMessageTitle',
          { defaultMessage: 'Get processes action failed' }
        )}
        dataTestSubj={'getProcessesErrorCallout'}
        errors={completedActionDetails?.errors}
        ResultComponent={ResultComponent}
      />
    );
  }

  // Show results
  return (
    <ResultComponent data-test-subj="getProcessesSuccessCallout" showTitle={false}>
      <StyledEuiBasicTable items={[...tableEntries]} columns={columns} />
    </ResultComponent>
  );
});
GetProcessesActionResult.displayName = 'GetProcessesActionResult';
