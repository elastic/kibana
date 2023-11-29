/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useEffect } from 'react';
import { useSourcererDataView } from '../../containers/sourcerer';
import { useContractComponents } from '../../hooks/use_contract_component';
import { updateSourcererData } from '../sourcerer/sourcerer_updater';

export const LandingPageComponent = memo(() => {
  const { GetStarted } = useContractComponents();
  const { indicesExist } = useSourcererDataView();

  useEffect(() => {
    updateSourcererData({ indicesExist });
  }, [indicesExist]);

  return GetStarted ? <GetStarted /> : null;
});

LandingPageComponent.displayName = 'LandingPageComponent';
