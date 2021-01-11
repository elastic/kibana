/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiSpacer } from '@elastic/eui';
import React from 'react';

import { AgentListPage } from '../../../../fleet/public';
import { OsqueryEditor } from '../../editor';

const NewLiveQueryPageComponent = () => {
  return (
    <>
      <OsqueryEditor />
      <EuiSpacer />
      <AgentListPage />
    </>
  );
};

export const NewLiveQueryPage = React.memo(NewLiveQueryPageComponent);
