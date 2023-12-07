/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState, ReactNode } from 'react';
import { reduce } from 'lodash';
import {
  EuiButtonIcon,
  EuiComboBox,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiInMemoryTable,
  EuiSuperSelect,
} from '@elastic/eui';
import {
  ActionConnectorMode,
  ActionParamsProps,
  TextAreaWithMessageVariables,
} from '@kbn/triggers-actions-ui-plugin/public';
import { useSubAction, useKibana } from '@kbn/triggers-actions-ui-plugin/public';
import { EuiBasicTableColumn, EuiSearchBarProps, EuiLink } from '@elastic/eui';
import { SUB_ACTION } from '../../../common/sentinelone/constants';
import type {
  SentinelOneGetAgentsParams,
  SentinelOneGetAgentsResponse,
  SentinelOneGetRemoteScriptsParams,
  SentinelOneGetRemoteScriptsResponse,
  SentinelOneActionParams,
} from '../../../common/sentinelone/types';
import type { SentinelOneExecuteSubActionParams } from './types';
import * as i18n from './translations';

type ScriptOption = SentinelOneGetRemoteScriptsResponse['data'][0];

const SentinelOneParamsFields: React.FunctionComponent<
  ActionParamsProps<SentinelOneActionParams>
> = ({ actionConnector, actionParams, editAction, index, executionMode, errors, ...rest }) => {
  const { toasts } = useKibana().notifications;
  const { subAction, subActionParams } = actionParams;
  const [selectedScript, setSelectedScript] = useState<ScriptOption | undefined>();

  const [selectedAgent, setSelectedAgent] = useState<Array<{ label: string }>>(() => {
    if (subActionParams?.computerName) {
      return [{ label: subActionParams?.computerName }];
    }
    return [];
  });
  const [connectorId] = useState<string | undefined>(actionConnector?.id);

  const isTest = useMemo(() => executionMode === ActionConnectorMode.Test, [executionMode]);

  const editSubActionParams = useCallback(
    (params: Partial<SentinelOneExecuteSubActionParams>) => {
      editAction('subActionParams', { ...subActionParams, ...params }, index);
    },
    [editAction, index, subActionParams]
  );

  const {
    response: { data: agents } = {},
    isLoading: isLoadingAgents,
    error: agentsError,
  } = useSubAction<SentinelOneGetAgentsParams, SentinelOneGetAgentsResponse>({
    connectorId,
    subAction: SUB_ACTION.GET_AGENTS,
    disabled: !isTest,
  });

  const agentOptions = useMemo(
    () =>
      reduce(
        agents,
        (acc, item) => {
          acc.push({
            label: item.computerName,
          });
          return acc;
        },
        [] as Array<{ label: string }>
      ),
    [agents]
  );

  const {
    response: { data: remoteScripts } = {},
    isLoading: isLoadingScripts,
    error: scriptsError,
  } = useSubAction<SentinelOneGetRemoteScriptsParams, SentinelOneGetRemoteScriptsResponse>({
    connectorId,
    subAction: SUB_ACTION.GET_REMOTE_SCRIPTS,
  });

  useEffect(() => {
    if (agentsError) {
      toasts.danger({ title: i18n.AGENTS_ERROR, body: agentsError.message });
    }
    if (scriptsError) {
      toasts.danger({ title: i18n.REMOTE_SCRIPTS_ERROR, body: scriptsError.message });
    }
  }, [toasts, scriptsError, agentsError]);

  const pagination = {
    initialPageSize: 10,
    pageSizeOptions: [10, 20, 50],
  };

  const search: EuiSearchBarProps = {
    defaultQuery: 'scriptType:action',
    box: {
      incremental: true,
    },
    filters: [
      {
        type: 'field_value_selection',
        field: 'scriptType',
        name: i18n.SCRIPT_TYPE_FILTER_LABEL,
        multiSelect: true,
        options: [
          {
            value: 'action',
          },
          { value: 'dataCollection' },
        ],
      },
      {
        type: 'field_value_selection',
        field: 'osTypes',
        name: i18n.OS_TYPES_FILTER_LABEL,
        multiSelect: true,
        options: [
          {
            value: 'Windows',
          },
          {
            value: 'macos',
          },
          {
            value: 'linux',
          },
        ],
      },
    ],
  };

  const [itemIdToExpandedRowMap, setItemIdToExpandedRowMap] = useState<Record<string, ReactNode>>(
    {}
  );

  const toggleDetails = (script: ScriptOption) => {
    const itemIdToExpandedRowMapValues = { ...itemIdToExpandedRowMap };

    if (script.id) {
      if (itemIdToExpandedRowMapValues[script.id]) {
        delete itemIdToExpandedRowMapValues[script.id];
      } else {
        itemIdToExpandedRowMapValues[script.id] = <>More details true</>;
      }
    }
    setItemIdToExpandedRowMap(itemIdToExpandedRowMapValues);
  };

  const columns: Array<EuiBasicTableColumn<SentinelOneGetRemoteScriptsResponse['data'][0]>> = [
    {
      field: 'scriptName',
      name: 'Script name',
    },
    {
      field: 'scriptType',
      name: 'Script type',
    },
    {
      field: 'osTypes',
      name: 'OS types',
    },
    {
      actions: [
        {
          name: 'Choose',
          description: 'Choose this script',
          isPrimary: true,
          onClick: (item) => {
            setSelectedScript(item);
            editSubActionParams({
              script: {
                scriptId: item.id,
                scriptRuntimeTimeoutSeconds: 3600,
                taskDescription: item.scriptName,
                requiresApproval: item.requiresApproval ?? false,
              },
            });
          },
        },
      ],
    },
    {
      align: 'right',
      width: '40px',
      isExpander: true,
      render: (script: ScriptOption) => {
        const itemIdToExpandedRowMapValues = { ...itemIdToExpandedRowMap };

        return (
          <EuiButtonIcon
            onClick={() => toggleDetails(script)}
            aria-label={itemIdToExpandedRowMapValues[script.id] ? 'Collapse' : 'Expand'}
            iconType={itemIdToExpandedRowMapValues[script.id] ? 'arrowDown' : 'arrowRight'}
          />
        );
      },
    },
  ];

  const actionTypeOptions = [
    {
      value: SUB_ACTION.KILL_PROCESS,
      inputDisplay: i18n.KILL_PROCESS_ACTION_LABEL,
    },
    {
      value: SUB_ACTION.ISOLATE_HOST,
      inputDisplay: i18n.ISOLATE_AGENT_ACTION_LABEL,
    },
    {
      value: SUB_ACTION.RELEASE_HOST,
      inputDisplay: i18n.RELEASE_AGENT_ACTION_LABEL,
    },
  ];

  const handleEditSubAction = useCallback(
    (payload) => {
      if (subAction !== payload) {
        editSubActionParams({});
        editAction('subAction', payload, index);
      }
    },
    [editAction, editSubActionParams, index, subAction]
  );

  return (
    <EuiFlexGroup direction="column">
      {isTest && (
        <EuiFlexItem>
          <EuiFormRow fullWidth label={i18n.AGENTS_FIELD_LABEL}>
            <EuiComboBox
              fullWidth
              placeholder={i18n.AGENTS_FIELD_PLACEHOLDER}
              singleSelection={{ asPlainText: true }}
              options={agentOptions}
              selectedOptions={selectedAgent}
              onChange={(item) => {
                setSelectedAgent(item);
                editSubActionParams({ computerName: item[0].label });
              }}
              isDisabled={isLoadingAgents}
            />
          </EuiFormRow>
        </EuiFlexItem>
      )}
      <EuiFlexItem>
        <EuiFormRow fullWidth label={i18n.ACTION_TYPE_LABEL}>
          <EuiSuperSelect
            fullWidth
            options={actionTypeOptions}
            valueOfSelected={subAction}
            onChange={handleEditSubAction}
          />
        </EuiFormRow>
      </EuiFlexItem>
      {subAction === SUB_ACTION.EXECUTE_SCRIPT && (
        <>
          <EuiFlexItem>
            <EuiFormRow
              fullWidth
              error={errors.script}
              isInvalid={!!errors.script?.length}
              label={'Script'}
              labelAppend={
                selectedScript ? (
                  <EuiLink onClick={() => setSelectedScript(undefined)}>
                    {i18n.CHANGE_ACTION_LABEL}
                  </EuiLink>
                ) : null
              }
            >
              {selectedScript?.scriptName ? (
                <EuiFieldText fullWidth value={selectedScript.scriptName} />
              ) : (
                <EuiInMemoryTable<ScriptOption>
                  items={remoteScripts ?? []}
                  itemId="scriptId"
                  loading={isLoadingScripts}
                  columns={columns}
                  search={search}
                  pagination={pagination}
                  sorting
                  hasActions
                  itemIdToExpandedRowMap={itemIdToExpandedRowMap}
                />
              )}
            </EuiFormRow>
          </EuiFlexItem>

          <>
            {selectedScript && (
              <EuiFlexItem>
                <TextAreaWithMessageVariables
                  index={index}
                  editAction={editAction}
                  messageVariables={[]}
                  paramsProperty={'subActionParams.script.inputParams'}
                  label={i18n.COMMAND_LABEL}
                  inputTargetValue={subActionParams?.script?.inputParams ?? undefined}
                  helpText={
                    selectedScript?.inputExample
                      ? `Example: ${selectedScript?.inputExample}`
                      : undefined
                  }
                />
              </EuiFlexItem>
            )}
          </>
        </>
      )}
    </EuiFlexGroup>
  );
};

// eslint-disable-next-line import/no-default-export
export { SentinelOneParamsFields as default };
