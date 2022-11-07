/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { useParams } from 'react-router-dom';
import { EuiTitle } from '@elastic/eui';

export const ExceptionListsDetailView = memo(() => {
  const { exceptionListId: listId } = useParams<{
    exceptionListId: string;
  }>();
  return (
    <EuiTitle>
      <h2>{listId}</h2>
    </EuiTitle>
  );
});

ExceptionListsDetailView.displayName = 'ExceptionListsDetailView';
