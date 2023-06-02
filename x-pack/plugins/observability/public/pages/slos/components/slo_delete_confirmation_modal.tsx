/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiConfirmModal } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { SLOWithSummaryResponse } from '@kbn/slo-schema';

export interface SloDeleteConfirmationModalProps {
  slo: SLOWithSummaryResponse;
  onCancel: () => void;
  onConfirm: () => void;
}

export function SloDeleteConfirmationModal({
  slo: { name },
  onCancel,
  onConfirm,
}: SloDeleteConfirmationModalProps) {
  return (
    <EuiConfirmModal
      buttonColor="danger"
      data-test-subj="sloDeleteConfirmationModal"
      title={i18n.translate('xpack.observability.slo.slo.deleteConfirmationModal.title', {
        defaultMessage: 'Are you sure?',
      })}
      cancelButtonText={i18n.translate(
        'xpack.observability.slo.slo.deleteConfirmationModal.cancelButtonLabel',
        {
          defaultMessage: 'Cancel',
        }
      )}
      confirmButtonText={i18n.translate(
        'xpack.observability.slo.slo.deleteConfirmationModal.deleteButtonLabel',
        {
          defaultMessage: 'Delete {name}',
          values: { name },
        }
      )}
      onCancel={onCancel}
      onConfirm={onConfirm}
    >
      {i18n.translate('xpack.observability.slo.slo.deleteConfirmationModal.descriptionText', {
        defaultMessage: "You can't recover {name} after deleting.",
        values: { name },
      })}
    </EuiConfirmModal>
  );
}
