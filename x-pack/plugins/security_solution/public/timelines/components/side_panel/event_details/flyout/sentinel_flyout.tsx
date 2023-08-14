/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { every } from 'lodash';
import React, { Suspense, useMemo, useState, useEffect } from 'react';
import type { Criteria } from '@elastic/eui';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiText,
  EuiTitle,
  EuiErrorBoundary,
  EuiLoadingSpinner,
  EuiBasicTable,
  EuiButton,
  EuiSpacer,
  EuiFormRow,
} from '@elastic/eui';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { useForm } from 'react-hook-form';
import { ActionConnectorMode } from '@kbn/triggers-actions-ui-plugin/public';
import { FormattedMessage } from '@kbn/i18n-react';
import { set } from '@kbn/safer-lodash-set';
import { useSubAction } from './use_sub_action';
import { useSubActionMutation } from './use_sub_action_mutation';

const connector = {
  actionTypeId: '.sentinelone',
  isPreconfigured: false,
  isDeprecated: false,
  referencedByCount: 0,
  isMissingSecrets: false,
  id: 'f5a8df50-08fc-11ee-9bf3-f3eed5c98bfd',
  name: 'Elastic sandbox',
  config: {
    url: 'https://usea1-partners.sentinelone.net/',
  },
  actionType: 'Sentinel One',
  compatibility: ['Alerting Rules'],
};

export const SentinelOneScriptStatus = ({
  connectorId = 'f5a8df50-08fc-11ee-9bf3-f3eed5c98bfd',
  parentTaskId,
}) => {
  console.error('zzzzz', parentTaskId);
  const [enabled, setEnabled] = useState(true);

  const subActionResults = useSubAction({
    connectorId,
    subAction: 'getRemoteScriptStatus',
    subActionParams: {
      parentTaskId,
    },
    enabled: parentTaskId && enabled,
    refetchInterval: 5000,
  });

  useEffect(() => {
    if (
      subActionResults?.data?.data?.data?.length &&
      every(subActionResults?.data?.data?.data, ['status', 'completed'])
    ) {
      setEnabled(false);
    }
  }, [subActionResults?.data?.data?.data]);

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

  console.error('xxx', subActionResults?.data?.data);

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
      loading={enabled}
      message={'Waiting for data...'}
    />
  );
};

export const SentinelFlyout = ({ onClose, ecsData }) => {
  console.error('ecsData', ecsData);
  const kibana = useKibana();

  const hostName = useMemo(() => ecsData.host?.name?.[0], [ecsData]);
  const processName = useMemo(() => ecsData.process?.name?.[0], [ecsData]);

  const actionTypeRegistry = kibana.services.triggersActionsUi.actionTypeRegistry;
  const actionTypeModel = actionTypeRegistry.get(connector.actionTypeId);
  const ParamsFieldsComponent = actionTypeModel.actionParamsFields;
  const [actionParams, setActionParams] = useState({
    subAction: '',
    subActionParams: {
      hostname: hostName,
      alert_ids: [ecsData?._id],
      processName,
    },
  });

  const {
    register,
    handleSubmit,
    watch,
    control,
    setValue,
    reset,
    formState: { errors },
  } = useForm({
    defaultValues: {
      data: {},
      filter: {
        computerName: hostName,
      },
    },
  });

  const formValues = watch();

  console.error('formValues', formValues);

  const sendSubAction = useSubActionMutation({
    connectorId: connector.id,
    subAction: actionParams.subAction,
    subActionParams: actionParams.subActionParams,
  });

  const onSubmit = (data) => {
    console.error('onSubmit data', data);
    sendSubAction.mutate();
  };

  const agentData = useSubAction({
    connectorId: connector.id,
    subAction: 'getAgents',
    subActionParams: {
      computerName: hostName,
    },
    refetchInterval: 5000,
  });

  console.error('agentData', agentData?.data?.data?.data?.[0]);

  const agentStatus = agentData?.data?.data?.data?.[0]?.networkStatus;

  console.error('sendSubAction', sendSubAction);

  return (
    <EuiFlyout onClose={onClose} size="m">
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2>{hostName}</h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiText>
          <EuiErrorBoundary>
            <Suspense
              fallback={
                <EuiFlexGroup justifyContent="center">
                  <EuiFlexItem grow={false}>
                    <EuiLoadingSpinner size="m" />
                  </EuiFlexItem>
                </EuiFlexGroup>
              }
            >
              <form onSubmit={handleSubmit(onSubmit)}>
                <ParamsFieldsComponent
                  actionParams={actionParams}
                  index={0}
                  errors={{}}
                  editAction={(field, value) => {
                    console.error('editActions', field, value);
                    setActionParams((prevValue) => {
                      set(prevValue, field, value);
                      return prevValue;
                    });
                    sendSubAction.reset();
                  }}
                  messageVariables={[]}
                  actionConnector={connector}
                  executionMode={ActionConnectorMode.Manual}
                />
                {actionParams.subAction === 'isolateAgent' && (
                  <EuiFormRow fullWidth>
                    <EuiText size="s">
                      <p>
                        <FormattedMessage
                          id="xpack.securitySolution.endpoint.hostIsolation.isolateThisHost"
                          defaultMessage="Isolate host {hostName} from network."
                          values={{ hostName: <b>{hostName}</b> }}
                        />
                        <br />
                      </p>
                      <p>
                        <FormattedMessage
                          id="xpack.securitySolution.endpoint.hostIsolation.isolateThisHostAbout"
                          defaultMessage="Isolating a host will disconnect it from the network. The host will only be able to communicate with the Kibana platform."
                        />{' '}
                      </p>
                    </EuiText>
                  </EuiFormRow>
                )}
                {actionParams.subAction === 'killProcess' && (
                  <EuiFormRow fullWidth>
                    <EuiText size="s">
                      <p>
                        <FormattedMessage
                          id="xpack.securitySolution.endpoint.killProcess.killProcess"
                          defaultMessage="Terminate process {processName} on host {hostName}."
                          values={{
                            hostName: <b>{hostName}</b>,
                            processName: <b>{processName}</b>,
                          }}
                        />
                        <br />
                      </p>
                    </EuiText>
                  </EuiFormRow>
                )}
                <EuiSpacer />
                <EuiButton
                  type="submit"
                  fill
                  isLoading={
                    sendSubAction.isLoading ||
                    (actionParams.subAction === 'isolateAgent' &&
                      sendSubAction.isSuccess &&
                      agentStatus !== 'disconnected') ||
                    (actionParams.subAction === 'releaseAgent' &&
                      sendSubAction.isSuccess &&
                      agentStatus !== 'connected')
                  }
                >
                  {'Submit'}
                </EuiButton>
              </form>
              {sendSubAction.isSuccess &&
                ['isolateAgent', 'releaseAgent'].includes(actionParams.subAction) && (
                  <>{`Agent status: ${agentStatus}`}</>
                )}
              {sendSubAction.data?.data?.data?.parentTaskId && (
                <SentinelOneScriptStatus
                  connectorId={connector.id}
                  parentTaskId={sendSubAction.data?.data?.data?.parentTaskId}
                />
              )}
            </Suspense>
          </EuiErrorBoundary>
        </EuiText>
      </EuiFlyoutBody>
    </EuiFlyout>
  );
};
