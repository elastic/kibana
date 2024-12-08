/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiModal, EuiModalHeader, EuiModalHeaderTitle, EuiModalBody } from '@elastic/eui';
import React, { type FC } from 'react';
import type { ObservablePatch } from '../../../common/types/api/observable/v1';
import type { Observable } from '../../../common/types/domain/observable/v1';
import { ObservableForm } from './observable_form';
import * as i18n from './translations';

export interface EditObservableModalProps {
  closeModal: VoidFunction;
  isLoading: boolean;
  handleUpdateObservable: (observable: ObservablePatch) => Promise<void>;
  observable: Observable;
}

export const EditObservableModal: FC<EditObservableModalProps> = ({
  closeModal,
  isLoading,
  handleUpdateObservable,
  observable,
}) => {
  return (
    <EuiModal data-test-subj="case-observables-edit-modal" onClose={closeModal}>
      <EuiModalHeader>
        <EuiModalHeaderTitle>{i18n.EDIT_OBSERVABLE}</EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <ObservableForm
          onCancel={closeModal}
          observable={observable}
          isLoading={isLoading}
          onSubmit={handleUpdateObservable}
        />
      </EuiModalBody>
    </EuiModal>
  );
};

EditObservableModal.displayName = 'EditObservableModal';
