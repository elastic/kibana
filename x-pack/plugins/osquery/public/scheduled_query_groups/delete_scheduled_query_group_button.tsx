/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiContextMenuItem } from '@elastic/eui';
import React, { useCallback, useState } from 'react';
import { useMutation, useQueryClient } from 'react-query';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import styled from 'styled-components';

import { PackagePolicy, packagePolicyRouteService } from '../../../fleet/common';
import { useKibana } from '../common/lib/kibana';
import { useAgentStatus } from '../agents/use_agent_status';
import { useAgentPolicy } from '../agent_policies/use_agent_policy';
import { ConfirmDeleteAgentPolicyModal } from './form/delete_confirmation_modal';

const DangerEuiContextMenuItem = styled(EuiContextMenuItem)`
  color: ${({ theme }) => theme.eui.euiTextColors.danger};
`;

interface DeleteScheduledQueryGroupButtonProps {
  item: PackagePolicy;
  onSuccess?: () => void;
}

const DeleteScheduledQueryGroupButtonComponent: React.FC<DeleteScheduledQueryGroupButtonProps> = ({
  item,
  onSuccess,
}) => {
  const queryClient = useQueryClient();
  const {
    application: { navigateToApp },
    http,
    notifications: { toasts },
  } = useKibana().services;
  const [confirmationModal, setConfirmationModal] = useState(false);

  const hideConfirmationModal = useCallback(() => setConfirmationModal(false), []);

  const { data: agentStatus } = useAgentStatus({ policyId: item.policy_id });
  const { data: agentPolicy } = useAgentPolicy({ policyId: item.policy_id });

  const { isLoading, mutate } = useMutation(
    () =>
      http.delete(packagePolicyRouteService.getDeletePath(), {
        body: JSON.stringify({ packagePolicyIds: [item.id], force: true }),
      }),
    {
      onSuccess: (response) => {
        queryClient.invalidateQueries('scheduledQueries');
        navigateToApp('osquery', { path: '/scheduled_query_groups' });
        toasts.addSuccess(
          i18n.translate('xpack.osquery.scheduledQueryGroup.deleteSuccessToastMessageText', {
            defaultMessage: 'Successfully deleted {scheduledQueryGroupName}',
            values: {
              scheduledQueryGroupName: response.item.name,
            },
          })
        );

        if (onSuccess) {
          onSuccess();
        }
      },
      onError: (error: Error) => {
        toasts.addError(error, {
          title: i18n.translate('xpack.osquery.scheduledQueryGroup.deleteErrorToastMessageTitle', {
            defaultMessage: 'Error deleting {scheduledQueryGroupName}',
            values: {
              scheduledQueryGroupName: agentPolicy.name,
            },
          }),
        });
      },
    }
  );

  const handleDelete = useCallback(() => {
    mutate();
    hideConfirmationModal();
  }, [hideConfirmationModal, mutate]);

  const handleDeleteClick = useCallback(() => {
    if (agentStatus?.total) {
      return setConfirmationModal(true);
    }

    handleDelete();
  }, [agentStatus?.total, handleDelete]);

  return (
    <>
      <DangerEuiContextMenuItem
        key="share"
        icon="trash"
        onClick={handleDeleteClick}
        disabled={!item ?? isLoading}
      >
        <FormattedMessage
          id="xpack.osquery.scheduledQueryGroupDetailsPage.deleteQueryButtonLabel"
          defaultMessage="Delete"
        />
      </DangerEuiContextMenuItem>
      {confirmationModal && agentStatus?.total && (
        <ConfirmDeleteAgentPolicyModal
          onConfirm={handleDelete}
          onCancel={hideConfirmationModal}
          agentCount={agentStatus?.total}
          agentPolicy={agentPolicy}
        />
      )}
    </>
  );
};

export const DeleteScheduledQueryGroupButton = React.memo(DeleteScheduledQueryGroupButtonComponent);
