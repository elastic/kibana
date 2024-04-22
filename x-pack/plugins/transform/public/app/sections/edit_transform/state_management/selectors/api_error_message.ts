/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useSelector } from 'react-redux';

import type { State } from '../edit_transform_flyout_state';

const selectApiErrorMessage = (s: State) => s.apiErrorMessage;
export const useApiErrorMessage = () => {
  return useSelector(selectApiErrorMessage);
};
