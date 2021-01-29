/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useContext, useEffect, useState } from 'react';

// @ts-expect-error types are not available for this package yet
import { SearchContext } from '@elastic/react-search-ui';

export const useSearchContextState = () => {
  const { driver } = useContext(SearchContext);
  const [state, setState] = useState(driver.state);

  useEffect(() => {
    driver.subscribeToStateChanges((newState: object) => {
      setState(newState);
    });
    return () => {
      driver.unsubscribeToStateChanges();
    };
  }, [state]);

  return state;
};

export const useSearchContextActions = () => {
  const { driver } = useContext(SearchContext);
  return driver.actions;
};
