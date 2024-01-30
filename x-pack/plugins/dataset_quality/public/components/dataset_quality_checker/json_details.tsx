/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

export const DetailsPreJson = ({ title, value }: { title: string; value: unknown }) => (
  <details>
    <summary>{title}</summary>
    <PreJson value={value} />
  </details>
);
export const PreJson = ({ value }: { value: unknown }) => (
  <pre>{JSON.stringify(value, null, 2)}</pre>
);
