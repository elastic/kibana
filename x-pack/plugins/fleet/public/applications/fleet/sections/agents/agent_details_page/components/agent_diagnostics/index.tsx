/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiBasicTableColumn } from '@elastic/eui';
import {
  EuiPortal,
  EuiToolTip,
  EuiBasicTable,
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLink,
  EuiLoadingSpinner,
  EuiText,
  EuiSkeletonText,
  formatDate,
  EuiSpacer,
  EuiSwitch,
} from '@elastic/eui';
import React, { useCallback, useEffect, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';

import {
  isAgentRequestDiagnosticsSupported,
  MINIMUM_DIAGNOSTICS_AGENT_VERSION,
} from '../../../../../../../../common/services';

import {
  sendGetAgentUploads,
  useAuthz,
  useLink,
  useStartServices,
  sendDeleteAgentUpload,
} from '../../../../../hooks';
import type { AgentDiagnostics, Agent } from '../../../../../../../../common/types/models';
import { AgentRequestDiagnosticsModal } from '../../../components/agent_request_diagnostics_modal';

export interface AgentDiagnosticsProps {
  agent: Agent;
}

export const AgentDiagnosticsTab: React.FunctionComponent<AgentDiagnosticsProps> = ({ agent }) => {
  const authz = useAuthz();
  const { notifications } = useStartServices();
  const { getAbsolutePath } = useLink();
  const [isLoading, setIsLoading] = useState(true);
  const [isShowingExpiredEntries, setIsShowingExpiredEntries] = useState(false);
  const [visibleDiagnosticsEntries, setVisibleDiagnosticEntries] = useState<AgentDiagnostics[]>([]);
  const [allDiagnosticsEntries, setAllDiagnosticEntries] = useState<AgentDiagnostics[]>([]);
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
      setAllDiagnosticEntries(entries);
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

  const deleteFile = (fileId: string) => {
    sendDeleteAgentUpload(fileId).then(({ data, error }) => {
      if (error || data?.deleted === false) {
        notifications.toasts.addError(error || new Error('Request returned `deleted: false`'), {
          title: i18n.translate(
            'xpack.fleet.requestDiagnostics.errorDeletingUploadNotificationTitle',
            {
              defaultMessage: 'Error deleting diagnostics file',
            }
          ),
        });
      } else {
        notifications.toasts.addSuccess({
          title: i18n.translate(
            'xpack.fleet.requestDiagnostics.successDeletingUploadNotificationTitle',
            {
              defaultMessage: 'Diagnostics file deleted',
            }
          ),
        });
      }
      loadData();
    });
  };

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
    setPrevDiagnosticEntries(allDiagnosticsEntries);
    if (prevDiagnosticsEntries.length > 0) {
      allDiagnosticsEntries
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
  }, [prevDiagnosticsEntries, allDiagnosticsEntries, notifications.toasts]);

  useEffect(() => {
    if (isShowingExpiredEntries) {
      setVisibleDiagnosticEntries(allDiagnosticsEntries);
    } else {
      setVisibleDiagnosticEntries(
        allDiagnosticsEntries.filter((entry) => entry.status !== 'EXPIRED')
      );
    }
  }, [allDiagnosticsEntries, isShowingExpiredEntries]);

  const columns: Array<EuiBasicTableColumn<AgentDiagnostics>> = [
    {
      field: 'id',
      name: i18n.translate('xpack.fleet.requestDiagnostics.tableColumns.fileLabelText', {
        defaultMessage: 'File',
      }),
      render: (id: string) => {
        const currentItem = allDiagnosticsEntries.find((item) => item.id === id);
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
            <EuiFlexGroup gutterSize="s" direction="row" alignItems="center">
              {currentItem?.error ? (
                <EuiFlexItem grow={false}>
                  <EuiToolTip
                    content={
                      <FormattedMessage
                        id="xpack.fleet.requestDiagnostics.errorGeneratingFileMessage"
                        defaultMessage="Error generating file: {reason}"
                        values={{ reason: currentItem.error }}
                      />
                    }
                  >
                    <EuiIcon type="warning" color="danger" />
                  </EuiToolTip>
                </EuiFlexItem>
              ) : currentItem?.status ? (
                <EuiFlexItem grow={false}>
                  <EuiToolTip content={currentItem.status}>
                    <EuiIcon type="warning" color="danger" />
                  </EuiToolTip>
                </EuiFlexItem>
              ) : null}
              <EuiFlexItem>{currentItem?.name}</EuiFlexItem>
            </EuiFlexGroup>
          </EuiLink>
        );
      },
    },
    {
      field: 'id',
      name: i18n.translate('xpack.fleet.requestDiagnostics.tableColumns.dateLabelText', {
        defaultMessage: 'Date',
      }),
      dataType: 'date',
      render: (id: string) => {
        const currentItem = allDiagnosticsEntries.find((item) => item.id === id);
        return (
          <EuiText size="s" color={currentItem?.status === 'READY' ? 'default' : 'subdued'}>
            {formatDate(currentItem?.createTime, 'lll')}
          </EuiText>
        );
      },
    },
    ...((authz.fleet.allAgents
      ? [
          {
            name: i18n.translate('xpack.fleet.requestDiagnostics.tableColumns.actionsLabelText', {
              defaultMessage: 'Actions',
            }),
            width: '70px',
            actions: [
              {
                type: 'icon',
                icon: 'trash',
                color: 'danger',
                name: i18n.translate(
                  'xpack.fleet.requestDiagnostics.tableColumns.deleteButtonText',
                  {
                    defaultMessage: 'Delete',
                  }
                ),
                available: (item: AgentDiagnostics) => item.status === 'READY',
                description: i18n.translate(
                  'xpack.fleet.requestDiagnostics.tableColumns.deleteButtonDesc',
                  {
                    defaultMessage: 'Delete diagnostics file',
                  }
                ),
                onClick: (item: AgentDiagnostics) => {
                  deleteFile(item.id);
                },
              },
            ],
          },
        ]
      : []) as Array<EuiBasicTableColumn<AgentDiagnostics>>),
  ];

  const requestDiagnosticsButton = (
    <EuiButton
      fill
      size="s"
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
              loadData();
            }}
          />
        </EuiPortal>
      )}
      <EuiText size="s">
        <p>
          <FormattedMessage
            id="xpack.fleet.requestDiagnostics.calloutText"
            defaultMessage="Consider changing the log level to debug before requesting a diagnostic. Diagnostics files are stored in Elasticsearch, and as such can incur storage costs. By default, files are deleted periodically through an ILM policy."
          />
        </p>
      </EuiText>
      <EuiSpacer size="m" />
      <EuiFlexGroup
        direction="row"
        gutterSize="m"
        alignItems="center"
        justifyContent="spaceBetween"
      >
        <EuiFlexItem grow={false}>
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
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiSwitch
            label={
              <FormattedMessage
                id="xpack.fleet.requestDiagnostics.showExpiredFilesLabel"
                defaultMessage="Show expired file requests"
              />
            }
            checked={isShowingExpiredEntries}
            onChange={(e) => setIsShowingExpiredEntries(e.target.checked)}
          />
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="m" />
      {isLoading ? (
        <EuiSkeletonText lines={3} />
      ) : (
        <EuiBasicTable<AgentDiagnostics> items={visibleDiagnosticsEntries} columns={columns} />
      )}
    </>
  );
};
