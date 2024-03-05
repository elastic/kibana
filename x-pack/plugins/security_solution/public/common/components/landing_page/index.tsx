/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { useSourcererDataView } from '../../containers/sourcerer';
import { Onboarding } from './onboarding';

export const LandingPageComponent = memo(() => {
  const { indicesExist } = useSourcererDataView();
  return <Onboarding indicesExist={indicesExist} />;
});

LandingPageComponent.displayName = 'LandingPageComponent';
