/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import styled from 'styled-components';
import moment from 'moment';
import { EuiBasicTable } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useConsoleActionSubmitter } from '../hooks/use_console_action_submitter';
import type {
  GetProcessesActionOutputContent,
  ProcessesRequestBody,
} from '../../../../../common/endpoint/types';
import { useSendGetKubeListRequest } from '../../../hooks/response_actions/use_send_get_kube_list_request';
import type { ActionRequestComponentProps } from '../types';

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

export const KubeListActionResult = memo<ActionRequestComponentProps>(
  ({ command, setStore, store, status, setStatus, ResultComponent }) => {
    const endpointId = command.commandDefinition?.meta?.endpointId;
    const actionCreator = useSendGetKubeListRequest();

    const actionRequestBody = useMemo(() => {
      return endpointId
        ? {
            endpoint_ids: [endpointId],
            comment: command.args.args?.comment?.[0],
            parameters: {
              resource: command.args.args?.resource?.[0],
            },
          }
        : undefined;
    }, [command.args.args?.comment, endpointId]);

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
      dataTestSubj: 'getKubeList',
    });

    const columns = useMemo(
      () => [
        {
          field: 'name',
          name: i18n.translate(
            'xpack.securitySolution.endpointResponseActions.getKubeList.table.header.name',
            { defaultMessage: 'NAME' }
          ),
          width: '20%',
        },
        {
          field: 'ready',
          name: i18n.translate(
            'xpack.securitySolution.endpointResponseActions.getKubeList.table.header.ready',
            { defaultMessage: 'READY' }
          ),
          width: '10%',
        },
        {
          field: 'status',
          name: i18n.translate(
            'xpack.securitySolution.endpointResponseActions.getKubeList.table.header.status',
            { defaultMessage: 'STATUS' }
          ),
          width: '10%',
        },
        {
          field: 'restarts',
          name: i18n.translate(
            'xpack.securitySolution.endpointResponseActions.getKubeList.table.header.restarts',
            { defaultMessage: 'RESTARTS' }
          ),
          width: '10%',
        },
        {
          field: 'age',
          name: i18n.translate(
            'xpack.securitySolution.endpointResponseActions.getKubeList.table.header.age',
            { defaultMessage: 'AGE' }
          ),
          width: '10%',
        },
        {
          field: 'ip',
          name: i18n.translate(
            'xpack.securitySolution.endpointResponseActions.getKubeList.table.header.ip',
            { defaultMessage: 'IP' }
          ),
          width: '15%',
        },
        {
          field: 'node',
          name: i18n.translate(
            'xpack.securitySolution.endpointResponseActions.getKubeList.table.header.node',
            { defaultMessage: 'NODE' }
          ),
          width: '25%',
        },
      ],
      []
    );

    console.log(completedActionDetails);

    const tableEntries = useMemo(() => {
      if (endpointId) {
        const result = completedActionDetails?.outputs?.[endpointId]?.content.result;
        if (result) {
          return [
            {
              name: result.metadata.name,
              ready: '1/1',
              status: result.status.phase,
              restarts: '0',
              age: moment(result.status.startTime).fromNow(true),
              ip: result.status.podIP,
              node: result.spec.nodeName,
            },
          ];
        }
      }
      return [];
    }, [completedActionDetails?.outputs, endpointId]);

    if (!completedActionDetails || !completedActionDetails.wasSuccessful) {
      return result;
    }

    console.log(tableEntries);

    // Show results
    return (
      <ResultComponent data-test-subj="getProcessesSuccessCallout" showTitle={false}>
        <StyledEuiBasicTable items={tableEntries} columns={columns} />
      </ResultComponent>
    );
  }
);
KubeListActionResult.displayName = 'KubeListActionResult';
