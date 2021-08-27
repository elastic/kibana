/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useContext } from 'react';
import { OwnerContext } from '.';

export const useOwnerContext = () => {
  const ownerContext = useContext(OwnerContext);

  if (ownerContext.length === 0) {
    throw new Error(
      'useOwnerContext must be used within an OwnerProvider and not be an empty array'
    );
  }

  return ownerContext;
};
