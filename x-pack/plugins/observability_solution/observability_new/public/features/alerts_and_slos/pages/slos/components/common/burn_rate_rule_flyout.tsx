/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { SLOWithSummaryResponse } from '@kbn/slo-schema';
import { useQueryClient } from '@tanstack/react-query';
import { useObservabilityRouter } from '../../../../../../hooks/use_router';
import { useGetFilteredRuleTypes } from '../../../../hooks/use_get_filtered_rule_types';
import { sloKeys } from '../../../../hooks/slo/query_key_factory';
import { useKibana } from '../../../../../../hooks/use_kibana';
import { SLO_BURN_RATE_RULE_TYPE_ID } from '../../../../../../../common/features/alerts_and_slos/constants';
import { sloFeatureId } from '../../../../../../../common/features/alerts_and_slos';

export function BurnRateRuleFlyout({
  slo,
  isAddRuleFlyoutOpen,
  canChangeTrigger,
  setIsAddRuleFlyoutOpen,
}: {
  slo?: SLOWithSummaryResponse;
  isAddRuleFlyoutOpen: boolean;
  canChangeTrigger?: boolean;
  setIsAddRuleFlyoutOpen?: (value: boolean) => void;
}) {
  const {
    triggersActionsUi: { getAddRuleFlyout: AddRuleFlyout },
  } = useKibana().services;
  const { push } = useObservabilityRouter();

  const filteredRuleTypes = useGetFilteredRuleTypes();

  const queryClient = useQueryClient();

  const handleSavedRule = async () => {
    if (setIsAddRuleFlyoutOpen) {
      queryClient.invalidateQueries({ queryKey: sloKeys.rules(), exact: false });
    } else {
      push('/slos', { path: '', query: '' });
    }
  };

  const handleCloseRuleFlyout = async () => {
    if (setIsAddRuleFlyoutOpen) {
      setIsAddRuleFlyoutOpen(false);
    } else {
      push('/slos', { path: '', query: '' });
    }
  };

  return isAddRuleFlyoutOpen && slo ? (
    <AddRuleFlyout
      canChangeTrigger={canChangeTrigger}
      consumer={sloFeatureId}
      filteredRuleTypes={filteredRuleTypes}
      ruleTypeId={SLO_BURN_RATE_RULE_TYPE_ID}
      initialValues={{ name: `${slo.name} Burn Rate rule`, params: { sloId: slo.id } }}
      onSave={handleSavedRule}
      onClose={handleCloseRuleFlyout}
      useRuleProducer
    />
  ) : null;
}
