/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FunctionComponent } from 'react';
import { i18n } from '@kbn/i18n';

import { EuiConfirmModal } from '@elastic/eui';
import type { DomainDeprecationDetails } from 'kibana/public';

interface Props {
  closeModal: () => void;
  deprecation: DomainDeprecationDetails;
  isResolvingDeprecation: boolean;
  resolveDeprecation: (deprecationDetails: DomainDeprecationDetails) => Promise<void>;
}

const i18nTexts = {
  getModalTitle: (domainId: string) =>
    i18n.translate(
      'xpack.upgradeAssistant.kibanaDeprecations.resolveConfirmationModal.modalTitle',
      {
        defaultMessage: "Resolve deprecation in '{domainId}'?",
        values: {
          domainId,
        },
      }
    ),
  cancelButtonLabel: i18n.translate(
    'xpack.upgradeAssistant.kibanaDeprecations.resolveConfirmationModal.cancelButtonLabel',
    {
      defaultMessage: 'Cancel',
    }
  ),
  resolveButtonLabel: i18n.translate(
    'xpack.upgradeAssistant.kibanaDeprecations.resolveConfirmationModal.resolveButtonLabel',
    {
      defaultMessage: 'Resolve',
    }
  ),
};

export const ResolveDeprecationModal: FunctionComponent<Props> = ({
  closeModal,
  deprecation,
  isResolvingDeprecation,
  resolveDeprecation,
}) => {
  return (
    <EuiConfirmModal
      data-test-subj="resolveModal"
      title={i18nTexts.getModalTitle(deprecation.domainId)}
      onCancel={closeModal}
      onConfirm={() => resolveDeprecation(deprecation)}
      cancelButtonText={i18nTexts.cancelButtonLabel}
      confirmButtonText={i18nTexts.resolveButtonLabel}
      defaultFocusedButton="confirm"
      isLoading={isResolvingDeprecation}
    />
  );
};
