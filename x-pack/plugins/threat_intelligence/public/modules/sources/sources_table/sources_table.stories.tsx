/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { SourcesTable } from '.';

export default {
  component: SourcesTable,
  title: 'SourcesTable',
};

export function Loading() {
  return <SourcesTable isLoading={true} items={[]} />;
}

export function WithSources() {
  return (
    <SourcesTable
      isLoading={false}
      items={[
        {
          name: 'AbuseCH',
          lastSeen: new Date(),
        },
      ]}
    />
  );
}
