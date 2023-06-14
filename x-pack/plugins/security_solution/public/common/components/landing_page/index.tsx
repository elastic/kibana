/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import useObservable from 'react-use/lib/useObservable';
import { SecurityPageName } from '../../../../common';
import { useKibana } from '../../lib/kibana';
import { SpyRoute } from '../../utils/route/spy_routes';

export const LandingPageComponent = memo(() => {
  const { getStartedComponent$ } = useKibana().services;
  const GetStartedComponent = useObservable(getStartedComponent$);

  return (
    <>
      {GetStartedComponent}
      <SpyRoute pageName={SecurityPageName.landing} />
    </>
  );
});

LandingPageComponent.displayName = 'LandingPageComponent';
