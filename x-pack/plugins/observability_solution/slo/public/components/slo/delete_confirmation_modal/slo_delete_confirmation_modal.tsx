/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiConfirmModal, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { ALL_VALUE, SLOWithSummaryResponse } from '@kbn/slo-schema';
import React from 'react';
import { getGroupKeysProse } from '../../../utils/slo/groupings';

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
  const { name, groupBy, instanceId } = slo;

  if ([groupBy].flat().every((group) => group === ALL_VALUE)) {
    return (
      <EuiConfirmModal
        buttonColor="danger"
        data-test-subj="sloDeleteConfirmationModal"
        title={getTitleLabel(name)}
        cancelButtonText={cancelButtonLabel}
        confirmButtonText={confirmButtonLabel}
        onCancel={onCancel}
        onConfirm={onConfirm}
      >
        <FormattedMessage
          id="xpack.slo.deleteConfirmationModal.descriptionText"
          defaultMessage="You can't recover this SLO after deleting it."
        />
      </EuiConfirmModal>
    );
  }

  return (
    <EuiConfirmModal
      buttonColor="danger"
      data-test-subj="sloDeleteConfirmationModal"
      title={getTitleLabel(name)}
      cancelButtonText={cancelButtonLabel}
      confirmButtonText={confirmButtonLabel}
      onCancel={onCancel}
      onConfirm={onConfirm}
    >
      <EuiFlexGroup direction="column">
        <EuiFlexItem>
          <FormattedMessage
            id="xpack.slo.deleteConfirmationModal.groupByDisclaimerText"
            defaultMessage="This SLO is an instance of its SLO definition using a group key on {groupKey} with the value {instanceId}."
            values={{ groupKey: getGroupKeysProse(slo.groupBy), instanceId }}
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <FormattedMessage
            id="xpack.slo.deleteConfirmationModal.groupByDisclaimerTextFollow"
            defaultMessage="Do you want to delete the SLO definition and all instances associated to it, or delete only this SLO instance '{instanceId}'?"
            values={{ groupKey: getGroupKeysProse(slo.groupBy), instanceId }}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiConfirmModal>
  );
}

const confirmButtonLabel = i18n.translate('xpack.slo.deleteConfirmationModal.deleteButtonLabel', {
  defaultMessage: 'Delete',
});

const cancelButtonLabel = i18n.translate('xpack.slo.deleteConfirmationModal.cancelButtonLabel', {
  defaultMessage: 'Cancel',
});

function getTitleLabel(name: string): React.ReactNode {
  return i18n.translate('xpack.slo.deleteConfirmationModal.title', {
    defaultMessage: 'Delete {name}?',
    values: { name },
  });
}
