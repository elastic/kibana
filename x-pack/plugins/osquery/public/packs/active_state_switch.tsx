/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSwitch, EuiLoadingSpinner } from '@elastic/eui';
import React, { useCallback, useMemo, useState } from 'react';
import { useQueryClient } from 'react-query';
import styled from 'styled-components';
import { i18n } from '@kbn/i18n';

import { PackagePolicy } from '../../../fleet/common';
import { useKibana } from '../common/lib/kibana';
import { useAgentPolicies } from '../agent_policies/use_agent_policies';
import { ConfirmDeployAgentPolicyModal } from './form/confirmation_modal';
import { useErrorToast } from '../common/hooks/use_error_toast';
import { useUpdatePack } from './use_update_pack';
import { PACKS_ID } from './constants';

const StyledEuiLoadingSpinner = styled(EuiLoadingSpinner)`
  margin-right: ${({ theme }) => theme.eui.paddingSizes.s};
`;

interface ActiveStateSwitchProps {
  disabled?: boolean;
  item: PackagePolicy & { policy_ids: string[] };
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

  const { data } = useAgentPolicies();

  const agentCount = useMemo(
    () =>
      item.policy_ids.reduce(
        (acc, policyId) => acc + (data?.agentPoliciesById[policyId]?.agents || 0),
        0
      ),
    [data?.agentPoliciesById, item.policy_ids]
  );

  const { isLoading, mutateAsync } = useUpdatePack({
    options: {
      // @ts-expect-error update types
      onSuccess: (response) => {
        queryClient.invalidateQueries(PACKS_ID);
        setErrorToast();
        toasts.addSuccess(
          response.attributes.enabled
            ? i18n.translate('xpack.osquery.pack.table.activatedSuccessToastMessageText', {
                defaultMessage: 'Successfully activated "{packName}" pack',
                values: {
                  packName: response.attributes.name,
                },
              })
            : i18n.translate('xpack.osquery.pack.table.deactivatedSuccessToastMessageText', {
                defaultMessage: 'Successfully deactivated "{packName}" pack',
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
    // @ts-expect-error update types
    mutateAsync({ id: item.id, enabled: !item.attributes.enabled });
    hideConfirmationModal();
  }, [hideConfirmationModal, item, mutateAsync]);

  const handleToggleActiveClick = useCallback(() => {
    if (agentCount) {
      return setConfirmationModal(true);
    }

    handleToggleActive();
  }, [agentCount, handleToggleActive]);

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
      {confirmationModal && agentCount && (
        <ConfirmDeployAgentPolicyModal
          onConfirm={handleToggleActive}
          onCancel={hideConfirmationModal}
          agentCount={agentCount}
          agentPolicyCount={item.policy_ids.length}
        />
      )}
    </>
  );
};

export const ActiveStateSwitch = React.memo(ActiveStateSwitchComponent);
