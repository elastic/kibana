/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { memo } from 'react';

export const EmptyState = memo<{
  onAdd: () => void;
}>(() => {
  return <h1>{'empty'}</h1>;
});

EmptyState.displayName = 'EmptyState';
