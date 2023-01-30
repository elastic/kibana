/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiTableFieldDataColumnType } from '@elastic/eui';
import { EuiToolTip } from '@elastic/eui';
import {
  EuiBasicTable,
  EuiButton,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLink,
  EuiLoadingContent,
  EuiLoadingSpinner,
  EuiText,
  formatDate,
} from '@elastic/eui';
import React, { useCallback, useEffect, useState } from 'react';
import styled from 'styled-components';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';

import {
  sendGetAgentUploads,
  sendPostRequestDiagnostics,
  useLink,
  useStartServices,
} from '../../../../../hooks';
import type { AgentDiagnostics, Agent } from '../../../../../../../../common/types/models';

const FlexStartEuiFlexItem = styled(EuiFlexItem)`
  align-self: flex-start;
`;

export interface AgentDiagnosticsProps {
  agent: Agent;
}

export const AgentDiagnosticsTab: React.FunctionComponent<AgentDiagnosticsProps> = ({ agent }) => {
  const { notifications } = useStartServices();
  const { getAbsolutePath } = useLink();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [diagnosticsEntries, setDiagnosticEntries] = useState<AgentDiagnostics[]>([]);
  const [prevDiagnosticsEntries, setPrevDiagnosticEntries] = useState<AgentDiagnostics[]>([]);

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
      setDiagnosticEntries(uploadsResponse.data.items);
      setIsLoading(false);
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
  }, [agent.id, notifications.toasts]);

  useEffect(() => {
    loadData();
    const interval: ReturnType<typeof setInterval> | null = setInterval(async () => {
      loadData();
    }, 10000);

    const cleanup = () => {
      if (interval) {
        clearInterval(interval);
      }
    };

    return cleanup;
  }, [loadData]);

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
          <EuiText color="subdued">
            <EuiLoadingSpinner /> &nbsp;
            <FormattedMessage
              id="xpack.fleet.requestDiagnostics.generatingText"
              defaultMessage="Generating diagnostics file..."
            />
          </EuiText>
        ) : (
          <EuiText color="subdued">
            <EuiToolTip content={`Diagnostics status: ${currentItem?.status}`}>
              <EuiIcon type="alert" color="red" />
            </EuiToolTip>
            &nbsp;
            {currentItem?.name}
          </EuiText>
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
            {formatDate(currentItem?.createTime, 'll')}
          </EuiText>
        );
      },
    },
  ];

  async function onSubmit() {
    try {
      setIsSubmitting(true);
      const { error } = await sendPostRequestDiagnostics(agent.id);
      if (error) {
        throw error;
      }
      setIsSubmitting(false);
      const successMessage = i18n.translate(
        'xpack.fleet.requestDiagnostics.successSingleNotificationTitle',
        {
          defaultMessage: 'Request diagnostics submitted',
        }
      );
      notifications.toasts.addSuccess(successMessage);
      loadData();
    } catch (error) {
      setIsSubmitting(false);
      notifications.toasts.addError(error, {
        title: i18n.translate('xpack.fleet.requestDiagnostics.fatalErrorNotificationTitle', {
          defaultMessage:
            'Error requesting diagnostics {count, plural, one {agent} other {agents}}',
          values: { count: 1 },
        }),
      });
    }
  }

  return (
    <EuiFlexGroup direction="column" gutterSize="l">
      <EuiFlexItem>
        <EuiCallOut
          iconType="alert"
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
            defaultMessage="Diagnostics files are stored in Elasticsearch, and as such can incur storage costs. Fleet will automatically remove old diagnostics files after 30 days."
          />
        </EuiCallOut>
      </EuiFlexItem>
      <FlexStartEuiFlexItem>
        <EuiButton fill size="m" onClick={onSubmit} disabled={isSubmitting}>
          <FormattedMessage
            id="xpack.fleet.agentList.diagnosticsOneButton"
            defaultMessage="Request diagnostics .zip"
          />
        </EuiButton>
      </FlexStartEuiFlexItem>
      <EuiFlexItem>
        {isLoading ? (
          <EuiLoadingContent lines={3} />
        ) : (
          <EuiBasicTable<AgentDiagnostics> items={diagnosticsEntries} columns={columns} />
        )}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
