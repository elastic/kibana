/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiTableFieldDataColumnType } from '@elastic/eui';
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
import moment from 'moment';
import { i18n } from '@kbn/i18n';

import {
  sendGetAgentUploads,
  sendPostRequestDiagnostics,
  useStartServices,
  sendGetActionStatus,
} from '../../../../../hooks';
import type { AgentDiagnostics, Agent } from '../../../../../../../../common/types/models';
import type { ActionStatus } from '../../../../../types';

const FlexStartEuiFlexItem = styled(EuiFlexItem)`
  align-self: flex-start;
`;

export interface AgentDiagnosticsProps {
  agent: Agent;
}

export interface DiagnosticsEntry {
  id: string;
  name: string;
  filePath?: string;
  status: string;
  createTime: string;
}

export const AgentDiagnosticsTab: React.FunctionComponent<AgentDiagnosticsProps> = ({ agent }) => {
  const { notifications } = useStartServices();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [diagnosticsEntries, setDiagnosticEntries] = useState<DiagnosticsEntry[]>([]);

  const createDiagnosticEntries = (
    currentDiagnostics: AgentDiagnostics[],
    currentActions: ActionStatus[]
  ) => {
    const requestDiagnosticsActions = currentActions.filter(
      (action) => action.type === 'REQUEST_DIAGNOSTICS'
    );

    return requestDiagnosticsActions.map((action) => {
      const upload = currentDiagnostics.find((diag) => diag.actionId === action.actionId);
      const fileName =
        upload?.name ?? `${moment(action.creationTime).format('YYYY-MM-DD HH:mm:ss')}.zip`;
      const filePath = upload?.filePath ?? `/api/files/files/${action.actionId}/blob/${fileName}`; // TODO mock value
      return {
        id: action.actionId,
        status: action.status,
        createTime: action.creationTime,
        filePath,
        name: fileName,
      };
    });
  };

  const loadData = useCallback(async () => {
    try {
      const [uploadsResponse, actionStatusResponse] = await Promise.all([
        sendGetAgentUploads(agent.id),
        sendGetActionStatus(),
      ]);
      const error = uploadsResponse.error || actionStatusResponse.error;
      if (error) {
        throw error;
      }
      if (!uploadsResponse.data || !actionStatusResponse.data) {
        throw new Error('No data');
      }
      setDiagnosticEntries(
        createDiagnosticEntries(uploadsResponse.data.items, actionStatusResponse.data.items)
      );
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

  const columns: Array<EuiTableFieldDataColumnType<DiagnosticsEntry>> = [
    {
      field: 'id',
      name: 'File',
      render: (id: string) => {
        const currentItem = diagnosticsEntries.find((item) => item.id === id);
        return currentItem?.status === 'COMPLETE' ? (
          <EuiLink href={currentItem?.filePath} download target="_blank">
            <EuiIcon type="download" /> &nbsp; {currentItem?.name}
          </EuiLink>
        ) : currentItem?.status === 'IN_PROGRESS' ? (
          <EuiText color="subdued">
            <EuiLoadingSpinner /> &nbsp;
            <FormattedMessage
              id="xpack.fleet.requestDiagnostics.generatingText"
              defaultMessage="Generating diagnostics file..."
            />
          </EuiText>
        ) : (
          <EuiText color="subdued">
            <EuiIcon type="alert" color="red" /> &nbsp;
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
          <EuiText color={currentItem?.status === 'COMPLETE' ? 'default' : 'subdued'}>
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
          <EuiBasicTable<DiagnosticsEntry> items={diagnosticsEntries} columns={columns} />
        )}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
