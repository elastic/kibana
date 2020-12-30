/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, memo, useCallback, useEffect, useMemo, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { Dispatch } from 'redux';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiButtonProps,
  PropsForButton,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiOverlayMask,
  EuiText,
} from '@elastic/eui';

import { Immutable, TrustedApp } from '../../../../../common/endpoint/types';
import { AppAction } from '../../../../common/store/actions';
import { useTrustedAppsSelector } from './hooks';
import {
  getDeletionDialogEntry,
  isDeletionDialogOpen,
  isDeletionInProgress,
} from '../store/selectors';

const CANCEL_SUBJ = 'trustedAppDeletionCancel';
const CONFIRM_SUBJ = 'trustedAppDeletionConfirm';

const getTranslations = (entry: Immutable<TrustedApp> | undefined) => ({
  title: (
    <FormattedMessage
      id="xpack.securitySolution.trustedapps.deletionDialog.title"
      defaultMessage="Remove trusted application"
    />
  ),
  mainMessage: (
    <FormattedMessage
      id="xpack.securitySolution.trustedapps.deletionDialog.mainMessage"
      defaultMessage='You are removing trusted application "{name}".'
      values={{ name: <strong>{entry?.name}</strong> }}
    />
  ),
  subMessage: (
    <FormattedMessage
      id="xpack.securitySolution.trustedapps.deletionDialog.subMessage"
      defaultMessage="This action cannot be undone. Are you sure you wish to continue?"
    />
  ),
  cancelButton: (
    <FormattedMessage
      id="xpack.securitySolution.trustedapps.deletionDialog.cancelButton"
      defaultMessage="Cancel"
    />
  ),
  confirmButton: (
    <FormattedMessage
      id="xpack.securitySolution.trustedapps.deletionDialog.confirmButton"
      defaultMessage="Remove trusted application"
    />
  ),
});

const AutoFocusButton: FC<PropsForButton<EuiButtonProps>> = memo((props) => {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const button = <EuiButton buttonRef={buttonRef} {...props} />;

  useEffect(() => {
    if (buttonRef.current) {
      buttonRef.current.focus();
    }
  }, []);

  return button;
});

AutoFocusButton.displayName = 'AutoFocusButton';

export const TrustedAppDeletionDialog = memo(() => {
  const dispatch = useDispatch<Dispatch<AppAction>>();
  const isBusy = useTrustedAppsSelector(isDeletionInProgress);
  const entry = useTrustedAppsSelector(getDeletionDialogEntry);
  const translations = useMemo(() => getTranslations(entry), [entry]);
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
            <EuiModalHeaderTitle>{translations.title}</EuiModalHeaderTitle>
          </EuiModalHeader>

          <EuiModalBody>
            <EuiText>
              <p>{translations.mainMessage}</p>
              <p>{translations.subMessage}</p>
            </EuiText>
          </EuiModalBody>

          <EuiModalFooter>
            <EuiButtonEmpty onClick={onCancel} isDisabled={isBusy} data-test-subj={CANCEL_SUBJ}>
              {translations.cancelButton}
            </EuiButtonEmpty>

            <AutoFocusButton
              fill
              color="danger"
              onClick={onConfirm}
              isLoading={isBusy}
              data-test-subj={CONFIRM_SUBJ}
            >
              {translations.confirmButton}
            </AutoFocusButton>
          </EuiModalFooter>
        </EuiModal>
      </EuiOverlayMask>
    );
  } else {
    return <></>;
  }
});

TrustedAppDeletionDialog.displayName = 'TrustedAppDeletionDialog';
