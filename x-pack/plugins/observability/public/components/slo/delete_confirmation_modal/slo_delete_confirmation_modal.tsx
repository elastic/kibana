/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiConfirmModal } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ALL_VALUE, SLOWithSummaryResponse } from '@kbn/slo-schema';
import React from 'react';

export interface SloDeleteConfirmationModalProps {
  slo: SLOWithSummaryResponse;
  onCancel: () => void;
  onConfirm: () => void;
}

export function SloDeleteConfirmationModal({
  slo,
  onCancel,
  onConfirm,
}: SloDeleteConfirmationModalProps) {
  const { name, groupBy } = slo;
  return (
    <EuiConfirmModal
      buttonColor="danger"
      data-test-subj="sloDeleteConfirmationModal"
      title={i18n.translate('xpack.observability.slo.deleteConfirmationModal.title', {
        defaultMessage: 'Delete {name}?',
        values: { name },
      })}
      cancelButtonText={i18n.translate(
        'xpack.observability.slo.deleteConfirmationModal.cancelButtonLabel',
        { defaultMessage: 'Cancel' }
      )}
      confirmButtonText={i18n.translate(
        'xpack.observability.slo.deleteConfirmationModal.deleteButtonLabel',
        { defaultMessage: 'Delete' }
      )}
      onCancel={onCancel}
      onConfirm={onConfirm}
    >
      {groupBy !== ALL_VALUE
        ? i18n.translate(
            'xpack.observability.slo.deleteConfirmationModal.partitionByDisclaimerText',
            {
              defaultMessage:
                'This SLO has been generated with a partition key on "{partitionKey}". Deleting this SLO definition will result in all instances being deleted.',
              values: { partitionKey: groupBy },
            }
          )
        : i18n.translate('xpack.observability.slo.deleteConfirmationModal.descriptionText', {
            defaultMessage: "You can't recover this SLO after deleting it.",
          })}
    </EuiConfirmModal>
  );
}
