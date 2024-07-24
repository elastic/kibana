/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import type { EuiTextProps } from '@elastic/eui';
import { EuiBasicTable, EuiSpacer, EuiText } from '@elastic/eui';
import styled from 'styled-components';
import { useTestIdGenerator } from '../../hooks/use_test_id_generator';
import { KeyValueDisplay } from '../key_value_display';
import { ResponseActionFileDownloadLink } from '../response_action_file_download_link';
import type {
  ActionDetails,
  GetProcessesActionOutputContent,
  MaybeImmutable,
} from '../../../../common/endpoint/types';

export interface RunningProcessesActionResultsProps {
  action: MaybeImmutable<ActionDetails<GetProcessesActionOutputContent>>;
  /**
   * If defined, the results will only be displayed for the given agent id.
   * If undefined, then responses for all agents are displayed
   */
  agentId?: string;
  textSize?: EuiTextProps['size'];
  'data-test-subj'?: string;
}

export const RunningProcessesActionResults = memo<RunningProcessesActionResultsProps>(
  ({ action, agentId, textSize = 'm', 'data-test-subj': dataTestSubj }) => {
    return (
      <EuiText size={textSize}>
        {action.agentType === 'endpoint' ? (
          <EndpointRunningProcessesResults
            action={action}
            agentId={agentId}
            data-test-subj={dataTestSubj}
          />
        ) : action.agentType === 'sentinel_one' ? (
          <SentinelOneRunningProcessesResults
            action={action}
            agentId={agentId}
            data-test-subj={dataTestSubj}
          />
        ) : null}
      </EuiText>
    );
  }
);
RunningProcessesActionResults.displayName = 'RunningProcessesActionResults';

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

interface EndpointRunningProcessesResultsProps {
  action: MaybeImmutable<ActionDetails<GetProcessesActionOutputContent>>;
  /** If defined, only the results for the given agent id will be displayed. Else, all agents output will be displayed */
  agentId?: string;
  'data-test-subj'?: string;
}

/** @private */
const EndpointRunningProcessesResults = memo<EndpointRunningProcessesResultsProps>(
  ({ action, agentId, 'data-test-subj': dataTestSubj }) => {
    const testId = useTestIdGenerator(dataTestSubj);
    const agentIds: string[] = agentId ? [agentId] : [...action.agents];
    const columns = useMemo(
      () => [
        {
          field: 'user',
          'data-test-subj': testId('user'),
          name: i18n.translate(
            'xpack.securitySolution.endpointResponseActions.getProcesses.table.header.user',
            { defaultMessage: 'USER' }
          ),
          width: '10%',
        },
        {
          field: 'pid',
          'data-test-subj': testId('pid'),
          name: i18n.translate(
            'xpack.securitySolution.endpointResponseActions.getProcesses.table.header.pid',
            { defaultMessage: 'PID' }
          ),
          width: '5%',
        },
        {
          field: 'entity_id',
          'data-test-subj': testId('entity_id'),
          name: i18n.translate(
            'xpack.securitySolution.endpointResponseActions.getProcesses.table.header.enityId',
            { defaultMessage: 'ENTITY ID' }
          ),
          width: '30%',
        },

        {
          field: 'command',
          'data-test-subj': testId('command'),
          name: i18n.translate(
            'xpack.securitySolution.endpointResponseActions.getProcesses.table.header.command',
            { defaultMessage: 'COMMAND' }
          ),
          width: '55%',
        },
      ],
      [testId]
    );

    return (
      <div data-test-subj={testId()}>
        {agentIds.length > 1 ? (
          agentIds.map((id) => {
            const hostName = action.hosts[id].name;

            return (
              <div key={hostName}>
                <KeyValueDisplay
                  name={hostName}
                  value={
                    <StyledEuiBasicTable
                      data-test-subj={testId('processListTable')}
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
            data-test-subj={testId('processListTable')}
            items={action.outputs?.[agentIds[0]]?.content.entries ?? []}
            columns={columns}
          />
        )}
      </div>
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
  'data-test-subj'?: string;
}

/** @private */
const SentinelOneRunningProcessesResults = memo<SentinelOneRunningProcessesResultsProps>(
  ({ action, agentId, 'data-test-subj': dataTestSubj }) => {
    const testId = useTestIdGenerator(dataTestSubj);
    const agentIds = agentId ? [agentId] : action.agents;

    return (
      <div data-test-subj={dataTestSubj}>
        {agentIds.length === 1 ? (
          <ResponseActionFileDownloadLink
            action={action}
            canAccessFileDownloadLink={true}
            data-test-subj={testId('download')}
          />
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
                      data-test-subj={testId('download')}
                    />
                  }
                />
              </div>
            );
          })
        )}
      </div>
    );
  }
);
SentinelOneRunningProcessesResults.displayName = 'SentinelOneRunningProcessesResults';
