/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Location } from 'history';
import { useEffect } from 'react';
import { history } from '../../shared/Links/url_helpers';

export function useRedirect(redirectLocation?: Location) {
  useEffect(() => {
    if (redirectLocation) {
      history.replace(redirectLocation);
    }
  });
}
