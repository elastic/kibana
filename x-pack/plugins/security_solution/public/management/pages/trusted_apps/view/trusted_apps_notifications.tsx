/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { memo } from 'react';
import { i18n } from '@kbn/i18n';

import { ServerApiError } from '../../../../common/types';
import { Immutable, TrustedApp } from '../../../../../common/endpoint/types';
import { getDeletionDialogEntry, getDeletionError } from '../store/selectors';

import { useToasts } from '../../../../common/lib/kibana';
import { useTrustedAppsSelector } from './hooks';

const getDeletionErrorMessage = (
  error: ServerApiError,
  entry: Immutable<TrustedApp> | undefined
) => {
  return {
    title: i18n.translate('xpack.securitySolution.trustedapps.deletionError.title', {
      defaultMessage: 'Unable to remove "{name}"',
      values: { name: entry?.name },
    }),
    text: error.message,
  };
};

export const TrustedAppsNotifications = memo(() => {
  const deletionError = useTrustedAppsSelector(getDeletionError);
  const deletionDialogEntry = useTrustedAppsSelector(getDeletionDialogEntry);
  const toasts = useToasts();

  if (deletionError) {
    toasts.addDanger(getDeletionErrorMessage(deletionError, deletionDialogEntry));
  }

  return <></>;
});

TrustedAppsNotifications.displayName = 'TrustedAppsNotifications';
