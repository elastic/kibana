/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';

import { sendDeleteDownloadSource, useStartServices } from '../../../../hooks';
import type { DownloadSource } from '../../../../types';

import { useConfirmModal } from '../../hooks/use_confirm_modal';

import { getCountsForDownloadSource } from './services/get_count';

const ConfirmTitle = () => (
  <FormattedMessage
    id="xpack.fleet.settings.deleteDowloadSource.confirmModalTitle"
    defaultMessage="Delete and deploy changes?"
  />
);

interface ConfirmDeleteDescriptionProps {
  downloadSource: DownloadSource;
  agentCount: number;
  agentPolicyCount: number;
}

const ConfirmDeleteDescription: React.FunctionComponent<ConfirmDeleteDescriptionProps> = ({
  downloadSource,
  agentCount,
  agentPolicyCount,
}) => (
  <FormattedMessage
    id="xpack.fleet.settings.deleteDowloadSource.confirmModalText"
    defaultMessage="This action will delete {downloadSourceName} agent binary source. It will update {policies} and {agents}. This action can not be undone. Are you sure you wish to continue?"
    values={{
      downloadSourceName: <strong>{downloadSource.name}</strong>,
      agents: (
        <strong>
          <FormattedMessage
            id="xpack.fleet.settings.deleteDowloadSource.agentsCount"
            defaultMessage="{agentCount, plural, one {# agent} other {# agents}}"
            values={{
              agentCount,
            }}
          />
        </strong>
      ),
      policies: (
        <strong>
          <FormattedMessage
            id="xpack.fleet.settings.deleteDowloadSource.agentPolicyCount"
            defaultMessage="{agentPolicyCount, plural, one {# agent policy} other {# agent policies}}"
            values={{
              agentPolicyCount,
            }}
          />
        </strong>
      ),
    }}
  />
);

export function useDeleteDownloadSource(onSuccess: () => void) {
  const { confirm } = useConfirmModal();
  const { notifications } = useStartServices();
  const deleteDownloadSource = useCallback(
    async (downloadSource: DownloadSource) => {
      try {
        const { agentCount, agentPolicyCount } = await getCountsForDownloadSource(downloadSource);

        const isConfirmed = await confirm(
          <ConfirmTitle />,
          <ConfirmDeleteDescription
            data-test-subj="editDownloadSourcesDeleteModal.confirmModalText"
            downloadSource={downloadSource}
            agentCount={agentCount}
            agentPolicyCount={agentPolicyCount}
          />,
          {
            buttonColor: 'danger',
            confirmButtonText: i18n.translate(
              'xpack.fleet.settings.deleteDownloadSource.confirmButtonLabel',
              {
                defaultMessage: 'Delete and deploy',
              }
            ),
          }
        );

        if (!isConfirmed) {
          return;
        }

        const res = await sendDeleteDownloadSource(downloadSource.id);

        if (res.error) {
          throw res.error;
        }

        onSuccess();
      } catch (err) {
        notifications.toasts.addError(err, {
          title: i18n.translate('xpack.fleet.settings.deleteDownloadSource.errorToastTitle', {
            defaultMessage: 'Error deleting agent binary source.',
          }),
        });
      }
    },
    [confirm, notifications.toasts, onSuccess]
  );

  return { deleteDownloadSource };
}
