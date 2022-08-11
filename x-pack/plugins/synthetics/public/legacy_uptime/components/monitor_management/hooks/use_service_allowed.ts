/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useDispatch, useSelector } from 'react-redux';
import { useEffect } from 'react';
import { syntheticsServiceAllowedSelector } from '../../../state/selectors';
import { getSyntheticsServiceAllowed } from '../../../state/actions';

export const useSyntheticsServiceAllowed = () => {
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(getSyntheticsServiceAllowed.get());
  }, [dispatch]);

  return useSelector(syntheticsServiceAllowedSelector);
};
