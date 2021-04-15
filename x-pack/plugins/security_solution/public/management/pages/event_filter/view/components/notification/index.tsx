/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { i18n } from '@kbn/i18n';

import { Immutable, NewTrustedApp } from '../../../../../../../common/endpoint/types';
import { isCreationSuccessful } from '../../../store/selector';

import { useToasts } from '../../../../../../common/lib/kibana';
import { useEventFilterSelector } from '../../hooks';

const getCreationSuccessMessage = (entry?: Immutable<NewTrustedApp>) => {
  return i18n.translate('xpack.securitySolution.eventFilter.form.successToastTitle', {
    defaultMessage: '"{name}" has been added to the event exceptions list.',
    values: { name: entry?.name ?? 'Fake' },
  });
};

export const EventFilterNotification = memo(() => {
  const creationSuccessful = useEventFilterSelector(isCreationSuccessful);
  const toasts = useToasts();
  if (creationSuccessful) {
    toasts.addSuccess(getCreationSuccessMessage());
  }

  return <></>;
});

EventFilterNotification.displayName = 'EventFilterNotification';
