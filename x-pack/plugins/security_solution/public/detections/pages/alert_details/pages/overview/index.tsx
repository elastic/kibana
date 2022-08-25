/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSpacer } from '@elastic/eui';
import React from 'react';
import { useParams } from 'react-router-dom';
import { SecuritySolutionTabNavigation } from '../../../../../common/components/navigation';
import { getAlertDetailsNavTabs } from '../../constants/navigation';

export const AlertOverview = React.memo(() => {
  const { detailName: alertId } = useParams<{ detailName: string }>();
  return (
    <>
      <h1>{'Alert Details Header!'}</h1>
      <EuiSpacer />
      <SecuritySolutionTabNavigation navTabs={getAlertDetailsNavTabs(alertId)} />
      <EuiSpacer />
    </>
  );
});

AlertOverview.displayName = 'AlertOverview';
