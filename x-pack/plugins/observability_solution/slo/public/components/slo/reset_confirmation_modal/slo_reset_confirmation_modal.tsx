/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiConfirmModal } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { SLODefinitionResponse, SLOWithSummaryResponse } from '@kbn/slo-schema';
import React from 'react';

export interface SloResetConfirmationModalProps {
  slo: SLOWithSummaryResponse | SLODefinitionResponse;
  onCancel: () => void;
  onConfirm: () => void;
  isLoading?: boolean;
}

export function SloResetConfirmationModal({
  slo,
  onCancel,
  onConfirm,
  isLoading,
}: SloResetConfirmationModalProps) {
  const { name } = slo;
  return (
    <EuiConfirmModal
      buttonColor="danger"
      data-test-subj="sloResetConfirmationModal"
      title={i18n.translate('xpack.slo.resetConfirmationModal.title', {
        defaultMessage: 'Reset {name}?',
        values: { name },
      })}
      cancelButtonText={i18n.translate('xpack.slo.resetConfirmationModal.cancelButtonLabel', {
        defaultMessage: 'Cancel',
      })}
      confirmButtonText={i18n.translate('xpack.slo.resetConfirmationModal.resetButtonLabel', {
        defaultMessage: 'Reset',
      })}
      onCancel={onCancel}
      onConfirm={onConfirm}
      isLoading={isLoading}
    >
      {i18n.translate('xpack.slo.resetConfirmationModal.descriptionText', {
        defaultMessage: 'Resetting this SLO will also regenerate the historical data.',
      })}
    </EuiConfirmModal>
  );
}
