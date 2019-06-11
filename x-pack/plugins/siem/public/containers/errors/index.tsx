/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { onError } from 'apollo-link-error';
import { throttle, noop } from 'lodash/fp';
import uuid from 'uuid';

import * as i18n from './translations';

import { getStore } from '../../store';
import { appActions } from '../../store/actions';

export const errorLink = onError(({ graphQLErrors, networkError }) => {
  const store = getStore();
  const dispatch = throttle(50, store != null ? store.dispatch : noop);
  if (graphQLErrors != null && store != null) {
    dispatch(
      appActions.addError({
        id: uuid.v4(),
        title: i18n.DATA_FETCH_FAILURE,
        message: graphQLErrors.map(({ message }) => message),
      })
    );
  }

  if (networkError != null && store != null) {
    dispatch(
      appActions.addError({
        id: uuid.v4(),
        title: i18n.NETWORK_FAILURE,
        message: [networkError.message],
      })
    );
  }
});
