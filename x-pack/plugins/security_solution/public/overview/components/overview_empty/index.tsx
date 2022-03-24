/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useKibana } from '../../../common/lib/kibana';
import { APP_UI_ID, SecurityPageName } from '../../../../common/constants';
import { getAppLandingUrl } from '../../../common/components/link_to/redirect_to_overview';

const OverviewEmptyComponent: React.FC = () => {
  const { navigateToApp } = useKibana().services.application;

  navigateToApp(APP_UI_ID, {
    deepLinkId: SecurityPageName.landing,
    path: getAppLandingUrl(),
  });
  return null;
};

OverviewEmptyComponent.displayName = 'OverviewEmptyComponent';

export const OverviewEmpty = React.memo(OverviewEmptyComponent);
