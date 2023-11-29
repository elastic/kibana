/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useEffect } from 'react';
import { RulesTableContextProvider } from '../../../detection_engine/rule_management_ui/components/rules_table/rules_table/rules_table_context';
import { useSourcererDataView } from '../../containers/sourcerer';
import { useContractComponents } from '../../hooks/use_contract_component';
import { updateSourcererData } from '../sourcerer/sourcerer_updater';

const LandingPageContextComponent: React.FC = ({ children }) => {
  const { indicesExist } = useSourcererDataView();

  useEffect(() => {
    updateSourcererData({ indicesExist });
  }, [indicesExist]);

  return <RulesTableContextProvider>{children}</RulesTableContextProvider>;
};

export const LandingPageComponent = memo(() => {
  const { GetStarted } = useContractComponents();

  return GetStarted ? (
    <RulesTableContextProvider>
      <LandingPageContextComponent>
        <GetStarted />
      </LandingPageContextComponent>
    </RulesTableContextProvider>
  ) : null;
});

LandingPageComponent.displayName = 'LandingPageComponent';
