/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';

import { useActions, useValues } from 'kea';

import { EuiConfirmModal } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { CANCEL_BUTTON_LABEL } from '../../../shared/constants';
import { TelemetryLogic } from '../../../shared/telemetry/telemetry_logic';

import { SearchApplicationsListLogic } from './search_applications_list_logic';

export interface DeleteSearchApplicationModalProps {
  onClose: () => void;
  searchApplicationName: string;
}

export const DeleteSearchApplicationModal: React.FC<DeleteSearchApplicationModalProps> = ({
  searchApplicationName,
  onClose,
}) => {
  const { deleteSearchApplication } = useActions(SearchApplicationsListLogic);
  const { sendEnterpriseSearchTelemetry } = useActions(TelemetryLogic);
  const { isDeleteLoading } = useValues(SearchApplicationsListLogic);
  return (
    <EuiConfirmModal
      title={i18n.translate(
        'xpack.enterpriseSearch.searchApplications.list.deleteSearchApplicationModal.title',
        {
          defaultMessage: 'Permanently delete this search application?',
        }
      )}
      onCancel={onClose}
      onConfirm={() => {
        deleteSearchApplication({ searchApplicationName });
        sendEnterpriseSearchTelemetry({
          action: 'clicked',
          metric: 'entSearchApplications-deleteSearchApplicationConfirm',
        });
      }}
      cancelButtonText={CANCEL_BUTTON_LABEL}
      confirmButtonText={i18n.translate(
        'xpack.enterpriseSearch.searchApplications.list.deleteSearchApplicationModal.confirmButton.title',
        {
          defaultMessage: 'Yes, delete this search application',
        }
      )}
      buttonColor="danger"
      isLoading={isDeleteLoading}
    >
      <p>
        {i18n.translate(
          'xpack.enterpriseSearch.searchApplications.list.deleteSearchApplicationModal.delete.description',
          {
            defaultMessage:
              'Deleting your search application is not a reversible action. Your indices will not be affected. ',
          }
        )}
      </p>
    </EuiConfirmModal>
  );
};
