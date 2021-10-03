/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSwitch, EuiLoadingSpinner } from '@elastic/eui';
import React, { useCallback, useState } from 'react';
import { useQueryClient } from 'react-query';
import styled from 'styled-components';
import { i18n } from '@kbn/i18n';

import { PackagePolicy } from '../../../fleet/common';
import { useKibana } from '../common/lib/kibana';
import { useAgentStatus } from '../agents/use_agent_status';
import { useAgentPolicy } from '../agent_policies/use_agent_policy';
import { ConfirmDeployAgentPolicyModal } from './form/confirmation_modal';
import { useErrorToast } from '../common/hooks/use_error_toast';
import { useUpdatePack } from './use_update_pack';

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
    notifications: { toasts },
  } = useKibana().services;
  const setErrorToast = useErrorToast();
  const [confirmationModal, setConfirmationModal] = useState(false);

  const hideConfirmationModal = useCallback(() => setConfirmationModal(false), []);

  const { data: agentStatus } = useAgentStatus({ policyId: item.policy_id });
  const { data: agentPolicy } = useAgentPolicy({ policyId: item.policy_id });

  const { isLoading, mutateAsync } = useUpdatePack({
    options: {
      onSuccess: (response) => {
        queryClient.invalidateQueries('packList');
        setErrorToast();
        toasts.addSuccess(
          response.attributes.enabled
            ? i18n.translate('xpack.osquery.pack.table.activatedSuccessToastMessageText', {
                defaultMessage: 'Successfully activated {packName}',
                values: {
                  packName: response.attributes.name,
                },
              })
            : i18n.translate('xpack.osquery.pack.table.deactivatedSuccessToastMessageText', {
                defaultMessage: 'Successfully deactivated {packName}',
                values: {
                  packName: response.attributes.name,
                },
              })
        );
      },
      // @ts-expect-error update types
      onError: (error) => {
        setErrorToast(error, { title: error.body.error, toastMessage: error.body.message });
      },
    },
  });

  const handleToggleActive = useCallback(() => {
    mutateAsync({ id: item.id, enabled: !item.attributes.enabled });
    hideConfirmationModal();
  }, [hideConfirmationModal, item, mutateAsync]);

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
        // @ts-expect-error update types
        checked={item.attributes.enabled}
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
