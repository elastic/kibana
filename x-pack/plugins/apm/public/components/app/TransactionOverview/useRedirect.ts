/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Location } from 'history';
import { useEffect } from 'react';
import { useHistory } from 'react-router-dom';

export function useRedirect(redirectLocation?: Location) {
  const history = useHistory();

  useEffect(() => {
    if (redirectLocation) {
      history.replace(redirectLocation);
    }
  }, [history, redirectLocation]);
}
