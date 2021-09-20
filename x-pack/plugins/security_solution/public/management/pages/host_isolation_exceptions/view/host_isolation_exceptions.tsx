/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { getListItems } from '../store/selector';
import { useHostIsolationExceptionsSelector } from './hooks';

export const HostIsolationExceptions = () => {
  const listItems = useHostIsolationExceptionsSelector(getListItems);

  console.log(listItems);
  return (
    <>
      <h1>Exceptions list</h1>
    </>
  );
};
