/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { DetailsHeader } from './header';
import { DatasetSummary } from './dataset_summary';

// Allow for lazy loading
// eslint-disable-next-line import/no-default-export
export default function Details() {
  return (
    <>
      <DetailsHeader />
      <DatasetSummary />
    </>
  );
}
