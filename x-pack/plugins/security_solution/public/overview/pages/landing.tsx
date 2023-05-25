/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import { SpyRoute } from '../../common/utils/route/spy_routes';
import { SecurityPageName } from '../../../common/constants';
import { LandingPageComponent } from '../../common/components/landing_page';
import { useKibana } from '../../common/lib/kibana';

export const LandingPage = memo(() => {
  const { getStartedESSComponent } = useKibana().services;
  const GetStartedESSComponent = useMemo(() => getStartedESSComponent?.(), []);
  return (
    GetStartedESSComponent ?? (
      <>
        <>{'Server!!! Kibana'}</>
        <LandingPageComponent />
        <SpyRoute pageName={SecurityPageName.landing} />
      </>
    )
  );
});

LandingPage.displayName = 'LandingPage';
