/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { useKibana } from '../kibana';

const transactionOptions = { managed: true };

interface StartTransactionOptions {
  name: string;
  type?: string;
}

export const useStartTransaction = () => {
  const {
    services: { apm },
  } = useKibana();

  const startTransaction = useCallback(
    ({ name, type = 'user-interaction' }: StartTransactionOptions) => {
      return apm.startTransaction(name, type, transactionOptions);
    },
    [apm]
  );

  return { startTransaction };
};
