/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useState } from 'react';
import { i18n } from '@kbn/i18n';

import { ServerApiError } from '../../../../common/types';
import { Immutable, NewTrustedApp, TrustedApp } from '../../../../../common/endpoint/types';
import {
  getCreationDialogFormEntry,
  getDeletionDialogEntry,
  getDeletionError,
  isCreationSuccessful,
  isDeletionSuccessful,
  isEdit,
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
        'Unable to remove "{name}" from the trusted applications list. Reason: {message}',
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
      defaultMessage: '"{name}" has been removed from the trusted applications list.',
      values: { name: entry?.name },
    }),
  };
};

const getCreationSuccessMessage = (entry: Immutable<NewTrustedApp>) => {
  return {
    title: i18n.translate('xpack.securitySolution.trustedapps.creationSuccess.title', {
      defaultMessage: 'Success!',
    }),
    text: i18n.translate(
      'xpack.securitySolution.trustedapps.createTrustedAppFlyout.successToastTitle',
      {
        defaultMessage: '"{name}" has been added to the trusted applications list.',
        values: { name: entry.name },
      }
    ),
  };
};

const getUpdateSuccessMessage = (entry: Immutable<NewTrustedApp>) => {
  return {
    title: i18n.translate('xpack.securitySolution.trustedapps.updateSuccess.title', {
      defaultMessage: 'Success!',
    }),
    text: i18n.translate(
      'xpack.securitySolution.trustedapps.createTrustedAppFlyout.updateSuccessToastTitle',
      {
        defaultMessage: '"{name}" has been updated.',
        values: { name: entry.name },
      }
    ),
  };
};

export const TrustedAppsNotifications = memo(() => {
  const deletionError = useTrustedAppsSelector(getDeletionError);
  const deletionDialogEntry = useTrustedAppsSelector(getDeletionDialogEntry);
  const deletionSuccessful = useTrustedAppsSelector(isDeletionSuccessful);
  const creationDialogNewEntry = useTrustedAppsSelector(getCreationDialogFormEntry);
  const creationSuccessful = useTrustedAppsSelector(isCreationSuccessful);
  const editMode = useTrustedAppsSelector(isEdit);
  const toasts = useToasts();

  const [wasAlreadyHandled] = useState(new WeakSet());

  if (deletionError && deletionDialogEntry) {
    toasts.addDanger(getDeletionErrorMessage(deletionError, deletionDialogEntry));
  }

  if (deletionSuccessful && deletionDialogEntry) {
    toasts.addSuccess(getDeletionSuccessMessage(deletionDialogEntry));
  }

  if (
    creationSuccessful &&
    creationDialogNewEntry &&
    !wasAlreadyHandled.has(creationDialogNewEntry)
  ) {
    wasAlreadyHandled.add(creationDialogNewEntry);

    toasts.addSuccess(
      (editMode && getUpdateSuccessMessage(creationDialogNewEntry)) ||
        getCreationSuccessMessage(creationDialogNewEntry)
    );
  }

  return <></>;
});

TrustedAppsNotifications.displayName = 'TrustedAppsNotifications';
