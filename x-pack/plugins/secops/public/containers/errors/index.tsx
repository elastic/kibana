/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { onError } from 'apollo-link-error';

import { showError } from '../../components/error_toast';
import * as i18n from './translations';

export const errorLink = onError(({ graphQLErrors, networkError }) => {
  if (graphQLErrors != null) {
    graphQLErrors.map(({ message }) => showError(i18n.DATA_FETCH_FAILURE, message));
  }
  if (networkError != null) {
    showError(i18n.NETWORK_FAILURE, networkError.message);
  }
});
