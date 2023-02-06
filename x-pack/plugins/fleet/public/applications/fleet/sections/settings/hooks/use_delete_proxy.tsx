/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';

import { sendDeleteFleetProxy, useStartServices } from '../../../hooks';
import type { FleetProxy } from '../../../types';

import { useConfirmModal } from './use_confirm_modal';

const ConfirmTitle = () => (
  <FormattedMessage
    id="xpack.fleet.settings.deleteFleetProxy.confirmModalTitle"
    defaultMessage="Delete and deploy changes?"
  />
);

const ConfirmDescription: React.FunctionComponent = ({}) => (
  <FormattedMessage
    id="xpack.fleet.settings.deleteFleetProxy.confirmModalText"
    defaultMessage="This action will change agent policies currently using that proxy. Are you sure you wish to continue?"
  />
);

export function useDeleteProxy(onSuccess: () => void) {
  const { confirm } = useConfirmModal();
  const { notifications } = useStartServices();
  const deleteFleetProxy = useCallback(
    async (fleetProxy: FleetProxy) => {
      try {
        const isConfirmed = await confirm(<ConfirmTitle />, <ConfirmDescription />, {
          buttonColor: 'danger',
          confirmButtonText: i18n.translate(
            'xpack.fleet.settings.deleteFleetProxy.confirmButtonLabel',
            {
              defaultMessage: 'Delete and deploy changes',
            }
          ),
        });

        if (!isConfirmed) {
          return;
        }

        const res = await sendDeleteFleetProxy(fleetProxy.id);

        if (res.error) {
          throw res.error;
        }

        onSuccess();
      } catch (err) {
        notifications.toasts.addError(err, {
          title: i18n.translate('xpack.fleet.settings.deleteFleetProxy.errorToastTitle', {
            defaultMessage: 'Error deleting proxy',
          }),
        });
      }
    },
    [confirm, notifications.toasts, onSuccess]
  );

  return { deleteFleetProxy };
}
