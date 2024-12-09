/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const ADD_OBSERVABLE = i18n.translate('xpack.cases.caseView.observables.addObservable', {
  defaultMessage: 'Add observable',
});

export const EDIT_OBSERVABLE = i18n.translate('xpack.cases.caseView.observables.edit', {
  defaultMessage: 'Edit observable',
});

export const NO_OBSERVABLES = i18n.translate(
  'xpack.cases.caseView.observables.noObservablesAvailable',
  {
    defaultMessage: 'No observables available',
  }
);

export const SHOWING_OBSERVABLES = (totalObservables: number) =>
  i18n.translate('xpack.cases.caseView.observables.showingObservablesTitle', {
    values: { totalObservables },
    defaultMessage:
      'Showing {totalObservables} {totalObservables, plural, =1 {observable} other {observables}}',
  });

export const OBSERVABLES_TABLE = i18n.translate(
  'xpack.cases.caseView.observables.observablesTable',
  {
    defaultMessage: 'Observables table',
  }
);

export const SEARCH_PLACEHOLDER = i18n.translate(
  'xpack.cases.caseView.observables.searchPlaceholder',
  {
    defaultMessage: 'Search observables',
  }
);

export const DATE_ADDED = i18n.translate('xpack.cases.caseView.observables.dateAdded', {
  defaultMessage: 'Date added',
});

export const OBSERVABLE_TYPE = i18n.translate('xpack.cases.caseView.observables.type', {
  defaultMessage: 'Observable type',
});

export const OBSERVABLE_VALUE = i18n.translate('xpack.cases.caseView.observables.value', {
  defaultMessage: 'Observable value',
});

export const OBSERVABLE_ACTIONS = i18n.translate('xpack.cases.caseView.observables.actions', {
  defaultMessage: 'Actions',
});

export const DELETE_OBSERVABLE = i18n.translate('xpack.cases.caseView.observables.delete', {
  defaultMessage: 'Delete observable',
});

export const CANCEL = i18n.translate('xpack.cases.caseView.observables.cancel', {
  defaultMessage: 'Cancel',
});

export const VALUE_PLACEHOLDER = i18n.translate(
  'xpack.cases.caseView.observables.valuePlaceholder',
  {
    defaultMessage: 'Observable value',
  }
);

export const DELETE_OBSERVABLE_CONFIRM = i18n.translate(
  'xpack.cases.caseView.observables.deleteConfirmation',
  {
    defaultMessage: 'Are you sure you want to delete this observable?',
  }
);

export const OBSERVABLE_REMOVED = i18n.translate('xpack.cases.caseView.observables.removed', {
  defaultMessage: 'Observable removed',
});

export const OBSERVABLE_UPDATED = i18n.translate('xpack.cases.caseView.observables.updated', {
  defaultMessage: 'Observable updated',
});

export const OBSERVABLE_CREATED = i18n.translate('xpack.cases.caseView.observables.created', {
  defaultMessage: 'Observable created',
});

export const SAVE_OBSERVABLE = i18n.translate('xpack.cases.caseView.observables.save', {
  defaultMessage: 'Save observable',
});

export const ADDED = (type: string, value: string) =>
  i18n.translate('xpack.cases.caseView.observables.added', {
    defaultMessage: 'observable value "{value}" of type {type} added',
    values: { type, value },
  });

export const PLATINUM_NOTICE = i18n.translate('xpack.cases.caseView.observables.platinumNotice', {
  defaultMessage:
    'In order to assign observables to cases, you must be subscribed to an Elastic Platinum license',
});
