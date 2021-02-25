/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiButtonIcon,
  EuiCallOut,
  EuiTextColor,
  EuiLoadingSpinner,
} from '@elastic/eui';
import { isEmpty } from 'lodash';
import React, { memo, useEffect, useCallback, useState } from 'react';
import { CaseType } from '../../../../../../case/common/api';
import { Case } from '../../../containers/types';
import { useDeleteCases } from '../../../containers/use_delete_cases';
import { useGetCase } from '../../../containers/use_get_case';
import { ConfirmDeleteCaseModal } from '../../confirm_delete_case';
import { useCreateCaseModal } from '../../use_create_case_modal';
import * as i18n from './translations';

interface ExistingCaseProps {
  selectedCase: string | null;
  onCaseChanged: (id: string) => void;
}

const ExistingCaseComponent: React.FC<ExistingCaseProps> = ({ onCaseChanged, selectedCase }) => {
  const { data, isLoading, isError } = useGetCase(selectedCase ?? '');
  const [createdCase, setCreatedCase] = useState<Case | null>(null);

  const onCaseCreated = useCallback(
    (newCase: Case) => {
      onCaseChanged(newCase.id);
      setCreatedCase(newCase);
    },
    [onCaseChanged]
  );

  const { modal, openModal } = useCreateCaseModal({ caseType: CaseType.collection, onCaseCreated });

  // Delete case
  const {
    dispatchResetIsDeleted,
    handleOnDeleteConfirm,
    handleToggleModal,
    isLoading: isDeleting,
    isDeleted,
    isDisplayConfirmDeleteModal,
  } = useDeleteCases();

  useEffect(() => {
    if (isDeleted) {
      setCreatedCase(null);
      onCaseChanged('');
      dispatchResetIsDeleted();
    }
  }, [isDeleted, dispatchResetIsDeleted, onCaseChanged]);

  useEffect(() => {
    if (!isLoading && !isError && data != null) {
      setCreatedCase(data);
      onCaseChanged(data.id);
    }
  }, [data, isLoading, isError, onCaseChanged]);

  return (
    <>
      {createdCase == null && isEmpty(selectedCase) && (
        <EuiButton fill fullWidth onClick={openModal}>
          {i18n.CREATE_CASE}
        </EuiButton>
      )}
      {createdCase == null && isLoading && <EuiLoadingSpinner size="m" />}
      {createdCase != null && !isLoading && (
        <>
          <EuiCallOut title={i18n.CONNECTED_CASE} color="success">
            <EuiTextColor color="default">
              {createdCase.title}{' '}
              {!isDeleting && (
                <EuiButtonIcon color="danger" onClick={handleToggleModal} iconType="trash" />
              )}
              {isDeleting && <EuiLoadingSpinner size="m" />}
            </EuiTextColor>
          </EuiCallOut>
          <ConfirmDeleteCaseModal
            caseTitle={createdCase.title}
            isModalVisible={isDisplayConfirmDeleteModal}
            isPlural={false}
            onCancel={handleToggleModal}
            onConfirm={handleOnDeleteConfirm.bind(null, [createdCase])}
          />
        </>
      )}
      {modal}
    </>
  );
};

export const ExistingCase = memo(ExistingCaseComponent);
