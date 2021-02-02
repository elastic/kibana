/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiSpacer, EuiTitle } from '@elastic/eui';
import React from 'react';

import { ActionsTable } from '../../actions/actions_table';

const QueriesPageComponent = () => {
  return (
    <>
      <EuiTitle>
        <h1>{'Queries'}</h1>
      </EuiTitle>
      <EuiSpacer />
      <ActionsTable />
    </>
  );
};

export const QueriesPage = React.memo(QueriesPageComponent);
