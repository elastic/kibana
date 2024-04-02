/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiTableFieldDataColumnType } from '@elastic/eui';
import { EuiPortal } from '@elastic/eui';
import { EuiToolTip } from '@elastic/eui';
import {
  EuiBasicTable,
  EuiButton,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLink,
  EuiLoadingSpinner,
  EuiText,
  EuiSkeletonText,
  formatDate,
} from '@elastic/eui';
import React, { useCallback, useEffect, useState } from 'react';
import styled from 'styled-components';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';

import {
  isAgentRequestDiagnosticsSupported,
  MINIMUM_DIAGNOSTICS_AGENT_VERSION,
} from '../../../../../../../../common/services';

import { sendGetAgentUploads, useAuthz, useLink, useStartServices } from '../../../../../hooks';
import type { AgentDiagnostics, Agent } from '../../../../../../../../common/types/models';
import { AgentRequestDiagnosticsModal } from '../../../components/agent_request_diagnostics_modal';

const FlexStartEuiFlexItem = styled(EuiFlexItem)`
  align-self: flex-start;
`;

const MarginedIcon = styled(EuiIcon)`
  margin-right: 7px;
`;

export interface AgentDiagnosticsProps {
  agent: Agent;
}

export const AgentDiagnosticsTab: React.FunctionComponent<AgentDiagnosticsProps> = ({ agent }) => {
  const authz = useAuthz();
  const { notifications } = useStartServices();
  const { getAbsolutePath } = useLink();
  const [isLoading, setIsLoading] = useState(true);
  const [diagnosticsEntries, setDiagnosticEntries] = useState<AgentDiagnostics[]>([]);
  const [prevDiagnosticsEntries, setPrevDiagnosticEntries] = useState<AgentDiagnostics[]>([]);
  const [loadInterval, setLoadInterval] = useState(10000);
  const [isRequestDiagnosticsModalOpen, setIsRequestDiagnosticsModalOpen] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const uploadsResponse = await sendGetAgentUploads(agent.id);
      const error = uploadsResponse.error;
      if (error) {
        throw error;
      }
      if (!uploadsResponse.data) {
        throw new Error('No data');
      }
      const entries = uploadsResponse.data.items;
      setDiagnosticEntries(entries);
      setIsLoading(false);

      // query faster if an action is in progress, for quicker feedback
      if (
        entries.some(
          (entry) => entry.status === 'IN_PROGRESS' || entry.status === 'AWAITING_UPLOAD'
        )
      ) {
        setLoadInterval(3000);
      } else {
        setLoadInterval(10000);
      }
    } catch (err) {
      notifications.toasts.addError(err, {
        title: i18n.translate(
          'xpack.fleet.requestDiagnostics.errorLoadingUploadsNotificationTitle',
          {
            defaultMessage: 'Error loading diagnostics uploads',
          }
        ),
      });
    }
  }, [agent.id, notifications.toasts, setLoadInterval]);

  useEffect(() => {
    loadData();
    const interval: ReturnType<typeof setInterval> | null = setInterval(async () => {
      loadData();
    }, loadInterval);

    const cleanup = () => {
      if (interval) {
        clearInterval(interval);
      }
    };

    return cleanup;
  }, [loadData, loadInterval]);

  useEffect(() => {
    setPrevDiagnosticEntries(diagnosticsEntries);
    if (prevDiagnosticsEntries.length > 0) {
      diagnosticsEntries
        .filter((newEntry) => {
          const oldEntry = prevDiagnosticsEntries.find((entry) => entry.id === newEntry.id);
          return newEntry.status === 'READY' && (!oldEntry || oldEntry?.status !== 'READY');
        })
        .forEach((entry) => {
          notifications.toasts.addSuccess(
            {
              title: i18n.translate('xpack.fleet.requestDiagnostics.readyNotificationTitle', {
                defaultMessage: 'Agent diagnostics {name} ready',
                values: {
                  name: entry.name,
                },
              }),
            },
            { toastLifeTimeMs: 5000 }
          );
        });
    }
  }, [prevDiagnosticsEntries, diagnosticsEntries, notifications.toasts]);

  const errorIcon = <MarginedIcon type="warning" color="red" />;
  const getErrorMessage = (error?: string) => (error ? `Error: ${error}` : '');

  const columns: Array<EuiTableFieldDataColumnType<AgentDiagnostics>> = [
    {
      field: 'id',
      name: 'File',
      render: (id: string) => {
        const currentItem = diagnosticsEntries.find((item) => item.id === id);
        return currentItem?.status === 'READY' ? (
          <EuiLink href={getAbsolutePath(currentItem?.filePath)} download target="_blank">
            <EuiIcon type="download" /> &nbsp; {currentItem?.name}
          </EuiLink>
        ) : currentItem?.status === 'IN_PROGRESS' || currentItem?.status === 'AWAITING_UPLOAD' ? (
          <EuiLink color="subdued" disabled>
            <EuiLoadingSpinner /> &nbsp;
            <FormattedMessage
              id="xpack.fleet.requestDiagnostics.generatingText"
              defaultMessage="Generating diagnostics file..."
            />
          </EuiLink>
        ) : (
          <EuiLink color="subdued" disabled>
            {currentItem?.status ? (
              <EuiToolTip
                content={
                  <>
                    <p>Diagnostics status: {currentItem?.status}</p>
                    <p>{getErrorMessage(currentItem?.error)}</p>
                  </>
                }
              >
                {errorIcon}
              </EuiToolTip>
            ) : (
              errorIcon
            )}
            &nbsp;
            {currentItem?.name}
          </EuiLink>
        );
      },
    },
    {
      field: 'id',
      name: 'Date',
      dataType: 'date',
      render: (id: string) => {
        const currentItem = diagnosticsEntries.find((item) => item.id === id);
        return (
          <EuiText color={currentItem?.status === 'READY' ? 'default' : 'subdued'}>
            {formatDate(currentItem?.createTime, 'lll')}
          </EuiText>
        );
      },
    },
  ];

  const requestDiagnosticsButton = (
    <EuiButton
      fill
      size="m"
      onClick={() => {
        setIsRequestDiagnosticsModalOpen(true);
      }}
      disabled={!isAgentRequestDiagnosticsSupported(agent) || !authz.fleet.readAgents}
    >
      <FormattedMessage
        id="xpack.fleet.requestDiagnostics.diagnosticsOneButton"
        defaultMessage="Request diagnostics .zip"
      />
    </EuiButton>
  );

  return (
    <>
      {isRequestDiagnosticsModalOpen && (
        <EuiPortal>
          <AgentRequestDiagnosticsModal
            agents={[agent]}
            agentCount={1}
            onClose={() => {
              setIsRequestDiagnosticsModalOpen(false);
            }}
          />
        </EuiPortal>
      )}
      <EuiFlexGroup direction="column" gutterSize="l">
        <EuiFlexItem>
          <EuiCallOut
            iconType="warning"
            color="warning"
            title={
              <FormattedMessage
                id="xpack.fleet.fleetServerSetup.calloutTitle"
                defaultMessage="Agent diagnostics"
              />
            }
          >
            <FormattedMessage
              id="xpack.fleet.requestDiagnostics.calloutText"
              defaultMessage="Diagnostics files are stored in Elasticsearch, and as such can incur storage costs."
            />
          </EuiCallOut>
        </EuiFlexItem>
        <FlexStartEuiFlexItem>
          {isAgentRequestDiagnosticsSupported(agent) ? (
            requestDiagnosticsButton
          ) : (
            <EuiToolTip
              content={
                <FormattedMessage
                  id="xpack.fleet.requestDiagnostics.notSupportedTooltip"
                  defaultMessage="Requesting agent diagnostics is not supported for agents before version {version}."
                  values={{ version: MINIMUM_DIAGNOSTICS_AGENT_VERSION }}
                />
              }
            >
              {requestDiagnosticsButton}
            </EuiToolTip>
          )}
        </FlexStartEuiFlexItem>
        <EuiFlexItem>
          {isLoading ? (
            <EuiSkeletonText lines={3} />
          ) : (
            <EuiBasicTable<AgentDiagnostics> items={diagnosticsEntries} columns={columns} />
          )}
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};
