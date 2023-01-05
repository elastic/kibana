/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import styled from 'styled-components';
import moment from 'moment';
import _ from 'lodash';
import { EuiBasicTable } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useConsoleActionSubmitter } from '../hooks/use_console_action_submitter';
import type {
  KubeListActionOutputContent,
  KubeRequestBody,
} from '../../../../../common/endpoint/types';
import { useSendGetKubeListRequest } from '../../../hooks/response_actions/use_send_get_kube_list_request';
import type { ActionRequestComponentProps } from '../types';

const startTimeToAge = (startTime: string) => {
  const diffInDays = moment(moment.now()).diff(moment(startTime), 'days');
  const diffInHours = moment(moment.now()).diff(moment(startTime), 'hours');
  const remainingHours = diffInHours - diffInDays * 24;

  if (diffInDays > 0) {
    return `${diffInDays}d${remainingHours > 0 ? `${remainingHours}h` : ''}`;
  }
  const diffInMinutes = moment(moment.now()).diff(moment(startTime), 'minutes');
  const remainingMinutes = diffInMinutes - diffInHours * 60;

  if (diffInHours > 0) {
    return `${diffInHours}h${remainingMinutes > 0 ? `${remainingMinutes}m` : ''}`;
  }

  const diffInSeconds = moment(moment.now()).diff(moment(startTime), 'seconds');
  const remainingSeconds = diffInSeconds - diffInMinutes * 60;

  if (diffInMinutes > 0) {
    return `${diffInMinutes}m${remainingSeconds > 0 ? `${remainingSeconds}s` : ''}`;
  }

  return `${diffInSeconds}s`;
};

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

const getColumns = (resource: 'pod' | 'deployment') => {
  const commonColumns = [
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
  ];

  if (resource === 'pod') {
    return [
      ...commonColumns,
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
    ];
  }

  if (resource === 'deployment') {
    return [
      ...commonColumns,
      {
        field: 'upToDate',
        name: i18n.translate(
          'xpack.securitySolution.endpointResponseActions.getKubeList.table.header.upToDate',
          { defaultMessage: 'UP-TO-DATE' }
        ),
        width: '20%',
      },
      {
        field: 'available',
        name: i18n.translate(
          'xpack.securitySolution.endpointResponseActions.getKubeList.table.header.available',
          { defaultMessage: 'AVAILABLE' }
        ),
        width: '20%',
      },
      {
        field: 'age',
        name: i18n.translate(
          'xpack.securitySolution.endpointResponseActions.getKubeList.table.header.age',
          { defaultMessage: 'AGE' }
        ),
        width: '30%',
      },
    ];
  }
};

export const KubeListActionResult = memo<
  ActionRequestComponentProps<{
    resource: string[];
  }>
>(({ command, setStore, store, status, setStatus, ResultComponent }) => {
  const actionCreator = useSendGetKubeListRequest();

  const endpointId = command.commandDefinition?.meta?.endpointId;

  const actionRequestBody = useMemo(() => {
    const { resource, comment } = command.args.args;

    return endpointId
      ? {
          endpoint_ids: [endpointId],
          comment: comment?.[0],
          parameters: {
            resource: resource[0],
          },
        }
      : undefined;
  }, [command.args.args, endpointId]);

  const { result, actionDetails: completedActionDetails } = useConsoleActionSubmitter<
    KubeRequestBody,
    KubeListActionOutputContent
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

  const tableProps = useMemo(() => {
    if (endpointId) {
      const entries = completedActionDetails?.outputs?.[endpointId]?.content.entries;

      if (entries?.resource === 'deployment') {
        return {
          columns: getColumns(entries.resource),
          items: entries.items.map(({ metadata, status: kubeStatus }) => ({
            name: metadata.name,
            ready: `${kubeStatus.readyReplicas}/${kubeStatus.replicas}`,
            upToDate: kubeStatus.updatedReplicas,
            available: kubeStatus.availableReplicas,
            age: startTimeToAge(metadata.creationTimestamp),
          })),
        };
      }
      if (entries?.resource === 'pod') {
        return {
          columns: getColumns(entries.resource),
          items: entries.items.map(({ metadata, status: kubeStatus, spec }) => ({
            name: metadata.name,
            ready: `${kubeStatus.containerStatuses.filter(({ ready }) => ready).length}/${
              kubeStatus.containerStatuses.length
            }`,
            status: kubeStatus.phase,
            restarts: _.sumBy(kubeStatus.containerStatuses, 'restartCount'),
            age: startTimeToAge(metadata.creationTimestamp),
            ip: kubeStatus.podIP,
            node: spec.nodeName,
          })),
        };
      }
    }

    return {
      columns: [],
      items: [],
    };
  }, [completedActionDetails?.outputs, endpointId]);

  if (!completedActionDetails || !completedActionDetails.wasSuccessful) {
    return result;
  }

  // Show results
  return (
    <ResultComponent data-test-subj="getKubeListSuccessCallout" showTitle={false}>
      <StyledEuiBasicTable {...tableProps} />
    </ResultComponent>
  );
});
KubeListActionResult.displayName = 'KubeListActionResult';
