/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useMemo } from 'react';
import { Get } from '../../../../../src/plugins/kibana_utils/public';

export const hooksFactory = <T>(getContract: Get<T>) => {
  return () => useMemo(() => getContract(), []);
};
