/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useEffect } from 'react';
import { useRuleManagementFilters } from '../../../detection_engine/rule_management/logic/use_rule_management_filters';
import { isRulesTableEmpty } from '../../../detection_engine/rule_management_ui/components/rules_table/helpers';
import {
  RulesTableContextProvider,
  useRulesTableContext,
} from '../../../detection_engine/rule_management_ui/components/rules_table/rules_table/rules_table_context';
import { useSourcererDataView } from '../../containers/sourcerer';
import { useContractComponents } from '../../hooks/use_contract_component';
import { updateLandingPageContext } from './land_page_context';

const LandingPageContextComponent: React.FC = ({ children }) => {
  const {
    state: { isLoading },
  } = useRulesTableContext();
  const { data: ruleManagementFilters } = useRuleManagementFilters();
  const isTableEmpty = isRulesTableEmpty(ruleManagementFilters);
  const rulesInstalled = !isLoading && !isTableEmpty;

  const { indicesExist } = useSourcererDataView();

  useEffect(() => {
    updateLandingPageContext({ indicesExist, rulesInstalled });
  }, [indicesExist, rulesInstalled]);

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
