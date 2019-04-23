/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect } from 'react';
import { EuiPageContent, EuiSpacer } from '@elastic/eui';
import chrome from 'ui/chrome';
import { MANAGEMENT_BREADCRUMB } from 'ui/management';

import { WatchDetail } from './components/watch_detail';
import { WatchHistory } from './components/watch_history';
import { listBreadcrumb, statusBreadcrumb } from '../../lib/breadcrumbs';

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
  useEffect(
    () => {
      chrome.breadcrumbs.set([MANAGEMENT_BREADCRUMB, listBreadcrumb, statusBreadcrumb]);
    },
    [id]
  );

  return (
    <EuiPageContent>
      <WatchDetail watchId={id} />
      <EuiSpacer size="m" />
      <WatchHistory watchId={id} />
    </EuiPageContent>
  );
};
