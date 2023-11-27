/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { SLOWithSummaryResponse } from '@kbn/slo-schema';
import { useQueryClient } from '@tanstack/react-query';
import { useGetFilteredRuleTypes } from '../../../../hooks/use_get_filtered_rule_types';
import { sloKeys } from '../../../../hooks/slo/query_key_factory';
import { useKibana } from '../../../../utils/kibana_react';
import { SLO_BURN_RATE_RULE_TYPE_ID } from '../../../../../common/constants';
import { sloFeatureId } from '../../../../../common';

export function BurnRateRuleFlyout({
  slo,
  isAddRuleFlyoutOpen,
  setIsAddRuleFlyoutOpen,
}: {
  slo: SLOWithSummaryResponse;
  isAddRuleFlyoutOpen: boolean;
  setIsAddRuleFlyoutOpen: (value: boolean) => void;
}) {
  const {
    triggersActionsUi: { getAddRuleFlyout: AddRuleFlyout },
  } = useKibana().services;

  const filteredRuleTypes = useGetFilteredRuleTypes();

  const queryClient = useQueryClient();

  const handleSavedRule = async () => {
    queryClient.invalidateQueries({ queryKey: sloKeys.rules(), exact: false });
  };

  return isAddRuleFlyoutOpen ? (
    <AddRuleFlyout
      consumer={sloFeatureId}
      filteredRuleTypes={filteredRuleTypes}
      ruleTypeId={SLO_BURN_RATE_RULE_TYPE_ID}
      initialValues={{ name: `${slo.name} Burn Rate rule`, params: { sloId: slo.id } }}
      onSave={handleSavedRule}
      onClose={() => {
        setIsAddRuleFlyoutOpen(false);
      }}
      useRuleProducer
    />
  ) : null;
}
