/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiPageContent, EuiSpacer } from '@elastic/eui';
import { WatchDetail } from './components/watch_detail';
import { WatchHistory } from './components/watch_history';

export const WatchStatus = ({
  match: {
    params: { id },
  },
}: {
  match: {
    params: {
      id: string;
    };
  };
}) => {
  return (
    <EuiPageContent>
      <WatchDetail watchId={id} />
      <EuiSpacer size="xxl" />
      <WatchHistory watchId={id} />
    </EuiPageContent>
  );
};
