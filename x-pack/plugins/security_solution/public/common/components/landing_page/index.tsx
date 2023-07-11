/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import useObservable from 'react-use/lib/useObservable';
import { useKibana } from '../../lib/kibana';

export const LandingPageComponent = memo(() => {
  const { getStartedComponent$ } = useKibana().services;
  const GetStartedComponent = useObservable(getStartedComponent$);
  return <>{GetStartedComponent}</>;
});

LandingPageComponent.displayName = 'LandingPageComponent';
