/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { useParams } from 'react-router-dom';
import { EuiTitle } from '@elastic/eui';
import { ALL_ENDPOINT_ARTIFACT_LIST_IDS } from '../../../../common/endpoint/service/artifacts/constants';
import { NotFoundPage } from '../../../app/404';

export const ExceptionListsDetailView = memo(() => {
  const { exceptionListId: listId } = useParams<{
    exceptionListId: string;
  }>();
  return ALL_ENDPOINT_ARTIFACT_LIST_IDS.includes(listId) ? (
    <NotFoundPage />
  ) : (
    <EuiTitle>
      <h2>{listId}</h2>
    </EuiTitle>
  );
});

ExceptionListsDetailView.displayName = 'ExceptionListsDetailView';
