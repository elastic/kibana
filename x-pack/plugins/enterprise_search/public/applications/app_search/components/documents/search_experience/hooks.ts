/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useContext, useEffect, useState } from 'react';

import { SearchContext } from '@elastic/react-search-ui';
import type { SearchState } from '@elastic/search-ui';

export const useSearchContextState = () => {
  const { driver } = useContext(SearchContext);
  const [state, setState] = useState(driver.state);

  useEffect(() => {
    const subscription = (newState: SearchState) => {
      setState(newState);
    };
    driver.subscribeToStateChanges(subscription);
    return () => {
      driver.unsubscribeToStateChanges(subscription);
    };
  }, [state]);

  return state;
};

export const useSearchContextActions = () => {
  const { driver } = useContext(SearchContext);
  return driver.actions;
};
