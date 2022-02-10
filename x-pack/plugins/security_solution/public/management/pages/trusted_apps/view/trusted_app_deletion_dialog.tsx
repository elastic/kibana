/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonEmpty,
  EuiCallOut,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { memo, useCallback, useMemo } from 'react';
import { useDispatch } from 'react-redux';
import { Dispatch } from 'redux';
import { AutoFocusButton } from '../../../../common/components/autofocus_button/autofocus_button';
import { Immutable, TrustedApp } from '../../../../../common/endpoint/types';
import { AppAction } from '../../../../common/store/actions';
import { isPolicyEffectScope } from '../state/type_guards';
import {
  getDeletionDialogEntry,
  isDeletionDialogOpen,
  isDeletionInProgress,
} from '../store/selectors';
import { useTrustedAppsSelector } from './hooks';

const CANCEL_SUBJ = 'trustedAppDeletionCancel';
const CONFIRM_SUBJ = 'trustedAppDeletionConfirm';

const getTranslations = (entry: Immutable<TrustedApp> | undefined) => ({
  title: (
    <FormattedMessage
      id="xpack.securitySolution.trustedapps.deletionDialog.title"
      defaultMessage='Delete "{name}"'
      values={{ name: <b className="eui-textBreakWord">{entry?.name}</b> }}
    />
  ),
  calloutTitle: (
    <FormattedMessage
      id="xpack.securitySolution.trustedapps.deletionDialog.calloutTitle"
      defaultMessage="Warning"
    />
  ),
  calloutMessage: (
    <FormattedMessage
      id="xpack.securitySolution.trustedapps.deletionDialog.calloutMessage"
      defaultMessage="Deleting this entry will remove it from {count} associated {count, plural, one {policy} other {policies}}."
      values={{
        count:
          entry && isPolicyEffectScope(entry.effectScope)
            ? entry.effectScope.policies.length
            : 'all',
      }}
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
      defaultMessage="Delete"
    />
  ),
});

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
      <EuiModal onClose={onCancel}>
        <EuiModalHeader>
          <EuiModalHeaderTitle>{translations.title}</EuiModalHeaderTitle>
        </EuiModalHeader>

        <EuiModalBody>
          <EuiCallOut title={translations.calloutTitle} color="danger" iconType="alert">
            <p>{translations.calloutMessage}</p>
          </EuiCallOut>
          <EuiSpacer size="m" />
          <EuiText>
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
    );
  } else {
    return <></>;
  }
});

TrustedAppDeletionDialog.displayName = 'TrustedAppDeletionDialog';
