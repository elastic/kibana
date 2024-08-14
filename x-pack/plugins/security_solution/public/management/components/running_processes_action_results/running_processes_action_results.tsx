/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import type { EuiAccordionProps, EuiTextProps } from '@elastic/eui';
import { EuiAccordion, EuiBasicTable, EuiSpacer, EuiText, useGeneratedHtmlId } from '@elastic/eui';
import styled from 'styled-components';
import { FormattedMessage } from '@kbn/i18n-react';
import { css } from '@emotion/css';
import { useUserPrivileges } from '../../../common/components/user_privileges';
import { useTestIdGenerator } from '../../hooks/use_test_id_generator';
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
  ({ action, agentId, textSize = 's', 'data-test-subj': dataTestSubj }) => {
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
    font-size: inherit;
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

    const wrappingClassname = useMemo(() => {
      return css({
        '.accordion-host-name-button-content': {
          'font-size': 'inherit',
        },
      });
    }, []);

    return (
      <div data-test-subj={testId()} className={wrappingClassname}>
        {agentIds.length > 1 ? (
          agentIds.map((id) => {
            const hostName = action.hosts[id].name;

            return (
              <div key={hostName}>
                <HostProcessesAccordion
                  buttonContent={<HostNameHeader hostName={hostName} />}
                  data-test-subj={testId('hostOutput')}
                >
                  <StyledEuiBasicTable
                    data-test-subj={testId('processListTable')}
                    items={action.outputs?.[id]?.content.entries ?? []}
                    columns={columns}
                  />
                </HostProcessesAccordion>

                <EuiSpacer size="m" />
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
    const { canGetRunningProcesses } = useUserPrivileges().endpointPrivileges;

    // If user is not allowed to execute the running processes response action (but may still have
    // access to the Response Actions history log), then we don't show any results because user
    // does not have access to the file download apis.
    if (!canGetRunningProcesses) {
      return null;
    }

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
            const hostName = action.hosts[id].name;

            return (
              <div key={id}>
                <HostProcessesAccordion
                  buttonContent={<HostNameHeader hostName={hostName} />}
                  data-test-subj={testId('hostOutput')}
                >
                  <ResponseActionFileDownloadLink
                    action={action}
                    agentId={id}
                    canAccessFileDownloadLink={canGetRunningProcesses}
                    data-test-subj={testId('download')}
                  />
                </HostProcessesAccordion>

                <EuiSpacer size="m" />
              </div>
            );
          })
        )}
      </div>
    );
  }
);
SentinelOneRunningProcessesResults.displayName = 'SentinelOneRunningProcessesResults';

interface HostNameHeaderProps {
  hostName: string;
}

const HostNameHeader = memo<HostNameHeaderProps>(({ hostName }) => {
  return (
    <FormattedMessage
      id="xpack.securitySolution.runningProcessesActionResults.accordionHostName"
      defaultMessage="Host: {hostName}"
      values={{ hostName }}
    />
  );
});
HostNameHeader.displayName = 'HostNameHeader';

interface HostProcessesAccordionProps {
  buttonContent: EuiAccordionProps['buttonContent'];
  children: React.ReactNode;
  'data-test-subj'?: string;
}

const HostProcessesAccordion = memo<HostProcessesAccordionProps>(
  ({ buttonContent, 'data-test-subj': dataTestSubj, children }) => {
    const htmlId = useGeneratedHtmlId();

    // FYI: Class name used below is defined at the top-level - under component `RunningProcessesActionResults`
    return (
      <EuiAccordion
        id={`ProcessesOutput_${htmlId}`}
        initialIsOpen={false}
        paddingSize="s"
        data-test-subj={dataTestSubj}
        buttonClassName="accordion-host-name-button-content"
        buttonContent={buttonContent}
      >
        {children}
      </EuiAccordion>
    );
  }
);
HostProcessesAccordion.displayName = 'HostProcessesAccordion';
