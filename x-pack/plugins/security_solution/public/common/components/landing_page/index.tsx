/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { useSourcererDataView } from '../../containers/sourcerer';
import { useContractComponents } from '../../hooks/use_contract_component';

export const LandingPageComponent = memo(() => {
  const { GetStarted } = useContractComponents();
  const { indicesExist } = useSourcererDataView();
  return GetStarted ? <GetStarted indicesExist={indicesExist} /> : null;
});

LandingPageComponent.displayName = 'LandingPageComponent';
