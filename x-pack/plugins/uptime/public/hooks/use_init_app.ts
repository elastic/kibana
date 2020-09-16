/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { getConnectorsAction } from '../state/alerts/alerts';

// this hook will be use to reload all the data required in common view in app
export const useInitApp = () => {
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(getConnectorsAction.get());
  }, [dispatch]);
};
