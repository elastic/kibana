/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useRouteMatch } from 'react-router-dom';
import { MONITOR_EDIT_ROUTE } from '../../../../../../common/constants';

export const useIsEditFlow = () => {
  const editRouteMatch = useRouteMatch({ path: MONITOR_EDIT_ROUTE });
  return editRouteMatch?.isExact || false;
};
