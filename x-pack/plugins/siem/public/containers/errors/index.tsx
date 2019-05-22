/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { onError } from 'apollo-link-error';
import uuid from 'uuid';

import { getStore } from '../../store';
import { appActions } from '../../store/actions';

import * as i18n from './translations';

export const errorLink = onError(({ graphQLErrors, networkError }) => {
  const store = getStore();
  if (graphQLErrors != null && store != null) {
    graphQLErrors.forEach(({ message }) =>
      store.dispatch(
        appActions.addError({ id: uuid.v4(), title: i18n.DATA_FETCH_FAILURE, message })
      )
    );
  }

  if (networkError != null && store != null) {
    store.dispatch(
      appActions.addError({
        id: uuid.v4(),
        title: i18n.NETWORK_FAILURE,
        message: networkError.message,
      })
    );
  }
});
