/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { produce } from 'immer';
import { EuiSwitch, EuiLoadingSpinner } from '@elastic/eui';
import React, { useCallback, useState } from 'react';
import { useMutation, useQueryClient } from 'react-query';
import styled from 'styled-components';
import { i18n } from '@kbn/i18n';

import {
  PackagePolicy,
  UpdatePackagePolicy,
  packagePolicyRouteService,
} from '../../../fleet/common';
import { useKibana } from '../common/lib/kibana';
import { useAgentStatus } from '../agents/use_agent_status';
import { useAgentPolicy } from '../agent_policies/use_agent_policy';
import { ConfirmDeployAgentPolicyModal } from './form/confirmation_modal';
import { useErrorToast } from '../common/hooks/use_error_toast';

const StyledEuiLoadingSpinner = styled(EuiLoadingSpinner)`
  margin-right: ${({ theme }) => theme.eui.paddingSizes.s};
`;

interface ActiveStateSwitchProps {
  disabled?: boolean;
  item: PackagePolicy;
}

const ActiveStateSwitchComponent: React.FC<ActiveStateSwitchProps> = ({ item }) => {
  const queryClient = useQueryClient();
  const {
    application: {
      capabilities: { osquery: permissions },
    },
    http,
    notifications: { toasts },
  } = useKibana().services;
  const setErrorToast = useErrorToast();
  const [confirmationModal, setConfirmationModal] = useState(false);

  const hideConfirmationModal = useCallback(() => setConfirmationModal(false), []);

  const { data: agentStatus } = useAgentStatus({ policyId: item.policy_id });
  const { data: agentPolicy } = useAgentPolicy({ policyId: item.policy_id });

  const { isLoading, mutate } = useMutation(
    ({ id, ...payload }: UpdatePackagePolicy & { id: string }) =>
      http.put(packagePolicyRouteService.getUpdatePath(id), {
        body: JSON.stringify(payload),
      }),
    {
      onSuccess: (response) => {
        queryClient.invalidateQueries('scheduledQueries');
        setErrorToast();
        toasts.addSuccess(
          response.item.enabled
            ? i18n.translate(
                'xpack.osquery.scheduledQueryGroup.table.activatedSuccessToastMessageText',
                {
                  defaultMessage: 'Successfully activated {scheduledQueryGroupName}',
                  values: {
                    scheduledQueryGroupName: response.item.name,
                  },
                }
              )
            : i18n.translate(
                'xpack.osquery.scheduledQueryGroup.table.deactivatedSuccessToastMessageText',
                {
                  defaultMessage: 'Successfully deactivated {scheduledQueryGroupName}',
                  values: {
                    scheduledQueryGroupName: response.item.name,
                  },
                }
              )
        );
      },
      onError: (error) => {
        // @ts-expect-error update types
        setErrorToast(error, { title: error.body.error, toastMessage: error.body.message });
      },
    }
  );

  const handleToggleActive = useCallback(() => {
    const updatedPolicy = produce<
      UpdatePackagePolicy & { id: string },
      Omit<PackagePolicy, 'revision' | 'updated_at' | 'updated_by' | 'created_at' | 'created_by'> &
        Partial<{
          revision: number;
          updated_at: string;
          updated_by: string;
          created_at: string;
          created_by: string;
        }>
    >(item, (draft) => {
      delete draft.revision;
      delete draft.updated_at;
      delete draft.updated_by;
      delete draft.created_at;
      delete draft.created_by;

      draft.enabled = !item.enabled;
      draft.inputs[0].streams.forEach((stream) => {
        delete stream.compiled_stream;
      });

      return draft;
    });

    mutate(updatedPolicy);
    hideConfirmationModal();
  }, [hideConfirmationModal, item, mutate]);

  const handleToggleActiveClick = useCallback(() => {
    if (agentStatus?.total) {
      return setConfirmationModal(true);
    }

    handleToggleActive();
  }, [agentStatus?.total, handleToggleActive]);

  return (
    <>
      {isLoading && <StyledEuiLoadingSpinner />}
      <EuiSwitch
        checked={item.enabled}
        disabled={!permissions.writePacks || isLoading}
        showLabel={false}
        label=""
        onChange={handleToggleActiveClick}
      />
      {confirmationModal && agentStatus?.total && (
        <ConfirmDeployAgentPolicyModal
          onConfirm={handleToggleActive}
          onCancel={hideConfirmationModal}
          agentCount={agentStatus?.total}
          agentPolicy={agentPolicy}
        />
      )}
    </>
  );
};

export const ActiveStateSwitch = React.memo(ActiveStateSwitchComponent);
