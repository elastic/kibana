/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { memo, useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { Dispatch } from 'redux';
import { i18n } from '@kbn/i18n';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiOverlayMask,
} from '@elastic/eui';

import { AppAction } from '../../../../common/store/actions';
import { useTrustedAppsSelector } from './hooks';
import { isDeletionDialogOpen, isDeletionInProgress } from '../store/selectors';

const TRANSLATIONS = {
  title: i18n.translate('xpack.securitySolution.trustedapps.deletionDialog.title', {
    defaultMessage: 'Remove trusted application',
  }),
  message: i18n.translate('xpack.securitySolution.trustedapps.deletionDialog.message', {
    defaultMessage: 'This action cannot be undone. Are you sure you wish to continue?',
  }),
  cancelButton: i18n.translate('xpack.securitySolution.trustedapps.deletionDialog.cancelButton', {
    defaultMessage: 'Cancel',
  }),
  confirmButton: i18n.translate('xpack.securitySolution.trustedapps.deletionDialog.confirmButton', {
    defaultMessage: 'Remove trusted application',
  }),
};

export const TrustedAppDeletionDialog = memo(() => {
  const dispatch = useDispatch<Dispatch<AppAction>>();
  const isBusy = useTrustedAppsSelector(isDeletionInProgress);
  const onConfirm = useCallback(() => {
    dispatch({ type: 'trustedAppDeletionDialogConfirmed' });
  }, [dispatch]);
  const onCancel = useCallback(() => {
    if (!isBusy) {
      dispatch({ type: 'trustedAppDeletionDialogClosed' });
    }
  }, [dispatch, isBusy]);

  if (useTrustedAppsSelector(isDeletionDialogOpen)) {
    return (
      <EuiOverlayMask>
        <EuiModal onClose={onCancel}>
          <EuiModalHeader>
            <EuiModalHeaderTitle>{TRANSLATIONS.title}</EuiModalHeaderTitle>
          </EuiModalHeader>

          <EuiModalBody>
            <p>{TRANSLATIONS.message}</p>
          </EuiModalBody>

          <EuiModalFooter>
            <EuiButtonEmpty onClick={onCancel} isDisabled={isBusy}>
              {TRANSLATIONS.cancelButton}
            </EuiButtonEmpty>

            <EuiButton fill onClick={onConfirm} isLoading={isBusy}>
              {TRANSLATIONS.confirmButton}
            </EuiButton>
          </EuiModalFooter>
        </EuiModal>
      </EuiOverlayMask>
    );
  } else {
    return <></>;
  }
});

TrustedAppDeletionDialog.displayName = 'TrustedAppDeletionDialog';
