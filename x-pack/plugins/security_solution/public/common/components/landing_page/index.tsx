/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { useContractComponents } from '../../hooks/use_contract_component';

export const LandingPageComponent = memo(() => {
  const { GetStarted } = useContractComponents();

  return GetStarted ? <GetStarted /> : null;
});

LandingPageComponent.displayName = 'LandingPageComponent';
