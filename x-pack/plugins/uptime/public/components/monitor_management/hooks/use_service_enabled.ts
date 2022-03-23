/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useDispatch, useSelector } from 'react-redux';
import { useEffect } from 'react';
import { syntheticsServiceEnabledSelector } from '../../../state/selectors';
import { getSyntheticsServiceEnabled } from '../../../state/actions';

export const useServiceEnabled = () => {
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(getSyntheticsServiceEnabled.get());
  }, [dispatch]);

  return useSelector(syntheticsServiceEnabledSelector);
};
