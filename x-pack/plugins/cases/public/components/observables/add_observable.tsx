/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiFlexItem,
  EuiModal,
  EuiModalBody,
  EuiModalHeader,
  EuiModalHeaderTitle,
} from '@elastic/eui';
import React, { useState, useCallback } from 'react';

import type { ObservablePost } from '../../../common/types/api/observable/v1';
import type { CaseUI } from '../../../common';
import { useCasesToast } from '../../common/use_cases_toast';
import { useCasesContext } from '../cases_context/use_cases_context';
import * as i18n from './translations';
import { usePostObservable } from '../../containers/use_post_observables';
import { ObservableForm, type ObservableFormProps } from './observable_form';
import { useRefreshCaseViewPage } from '../case_view/use_on_refresh_case_view_page';
import { useCasesFeatures } from '../../common/use_cases_features';

export interface AddObservableProps {
  caseData: CaseUI;
}

const AddObservableComponent: React.FC<AddObservableProps> = ({ caseData }) => {
  const { permissions } = useCasesContext();
  const { showSuccessToast } = useCasesToast();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const { isLoading, mutateAsync: postObservables } = usePostObservable(caseData.id);
  const refreshCaseViewPage = useRefreshCaseViewPage();
  const { observablesAuthorized: isObservablesEnabled } = useCasesFeatures();

  const closeModal = () => setIsModalVisible(false);
  const showModal = () => setIsModalVisible(true);

  const handleCreateObservable = useCallback(
    async (observable: ObservablePost) => {
      await postObservables({
        observable,
      });

      showSuccessToast(i18n.OBSERVABLE_CREATED);
      refreshCaseViewPage();
      closeModal();
    },
    [postObservables, showSuccessToast, refreshCaseViewPage]
  );

  return permissions.create && permissions.update ? (
    <EuiFlexItem grow={false}>
      <EuiButton
        disabled={!isObservablesEnabled}
        title={isObservablesEnabled ? undefined : i18n.PLATINUM_NOTICE}
        data-test-subj="cases-observables-add"
        iconType="plusInCircle"
        onClick={showModal}
      >
        {i18n.ADD_OBSERVABLE}
      </EuiButton>
      {isModalVisible && (
        <EuiModal data-test-subj="cases-observables-add-modal" onClose={closeModal}>
          <EuiModalHeader>
            <EuiModalHeaderTitle>{i18n.ADD_OBSERVABLE}</EuiModalHeaderTitle>
          </EuiModalHeader>
          <EuiModalBody>
            <ObservableForm
              isLoading={isLoading}
              onSubmit={handleCreateObservable as ObservableFormProps['onSubmit']}
              onCancel={closeModal}
            />
          </EuiModalBody>
        </EuiModal>
      )}
    </EuiFlexItem>
  ) : null;
};

AddObservableComponent.displayName = 'AddObservable';

export const AddObservable = React.memo(AddObservableComponent);
