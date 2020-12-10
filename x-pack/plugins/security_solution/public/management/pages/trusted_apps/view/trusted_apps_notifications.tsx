/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { memo } from 'react';
import { i18n } from '@kbn/i18n';

import { ServerApiError } from '../../../../common/types';
import { Immutable, NewTrustedApp, TrustedApp } from '../../../../../common/endpoint/types';
import {
  getCreationDialogFormEntry,
  getDeletionDialogEntry,
  getDeletionError,
  isCreationSuccessful,
  isDeletionSuccessful,
} from '../store/selectors';

import { useToasts } from '../../../../common/lib/kibana';
import { useTrustedAppsSelector } from './hooks';

const getDeletionErrorMessage = (error: ServerApiError, entry: Immutable<TrustedApp>) => {
  return {
    title: i18n.translate('xpack.securitySolution.trustedapps.deletionError.title', {
      defaultMessage: 'Removal failure',
    }),
    text: i18n.translate('xpack.securitySolution.trustedapps.deletionError.text', {
      defaultMessage:
        'Unable to remove "{name}" from the Trusted Applications list. Reason: {message}',
      values: { name: entry.name, message: error.message },
    }),
  };
};

const getDeletionSuccessMessage = (entry: Immutable<TrustedApp>) => {
  return {
    title: i18n.translate('xpack.securitySolution.trustedapps.deletionSuccess.title', {
      defaultMessage: 'Successfully removed',
    }),
    text: i18n.translate('xpack.securitySolution.trustedapps.deletionSuccess.text', {
      defaultMessage: '"{name}" has been removed from the Trusted Applications list.',
      values: { name: entry?.name },
    }),
  };
};

const getCreationSuccessMessage = (entry: Immutable<NewTrustedApp>) => {
  return i18n.translate(
    'xpack.securitySolution.trustedapps.createTrustedAppFlyout.successToastTitle',
    {
      defaultMessage: '"{name}" has been added to the Trusted Applications list.',
      values: { name: entry.name },
    }
  );
};

export const TrustedAppsNotifications = memo(() => {
  const deletionError = useTrustedAppsSelector(getDeletionError);
  const deletionDialogEntry = useTrustedAppsSelector(getDeletionDialogEntry);
  const deletionSuccessful = useTrustedAppsSelector(isDeletionSuccessful);
  const creationDialogNewEntry = useTrustedAppsSelector(getCreationDialogFormEntry);
  const creationSuccessful = useTrustedAppsSelector(isCreationSuccessful);
  const toasts = useToasts();

  if (deletionError && deletionDialogEntry) {
    toasts.addDanger(getDeletionErrorMessage(deletionError, deletionDialogEntry));
  }

  if (deletionSuccessful && deletionDialogEntry) {
    toasts.addSuccess(getDeletionSuccessMessage(deletionDialogEntry));
  }

  if (creationSuccessful && creationDialogNewEntry) {
    toasts.addSuccess(getCreationSuccessMessage(creationDialogNewEntry));
  }

  return <></>;
});

TrustedAppsNotifications.displayName = 'TrustedAppsNotifications';
