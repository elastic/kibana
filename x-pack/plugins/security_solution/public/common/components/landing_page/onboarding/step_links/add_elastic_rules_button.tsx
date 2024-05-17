/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SecurityPageName } from '@kbn/security-solution-navigation';
import { LinkButton } from '@kbn/security-solution-navigation/links';
import React, { useCallback } from 'react';
import { useStepContext } from '../context/step_context';
import {
  AddAndValidateYourDataCardsId,
  AddIntegrationsSteps,
  EnablePrebuiltRulesSteps,
} from '../types';
import { AddIntegrationCallout } from './add_integration_callout';
import { ADD_ELASTIC_RULES, ADD_ELASTIC_RULES_CALLOUT_TITLE } from './translations';

const AddElasticRulesButtonComponent = () => {
  const { finishedSteps, onStepLinkClicked } = useStepContext();
  const isIntegrationsStepComplete = finishedSteps[
    AddAndValidateYourDataCardsId.addIntegrations
  ]?.has(AddIntegrationsSteps.connectToDataSources);

  const onClick = useCallback(() => {
    onStepLinkClicked({
      originStepId: EnablePrebuiltRulesSteps.enablePrebuiltRules,
      stepLinkId: SecurityPageName.rules,
    });
  }, [onStepLinkClicked]);
  return (
    <>
      {!isIntegrationsStepComplete && (
        <AddIntegrationCallout
          stepName={ADD_ELASTIC_RULES_CALLOUT_TITLE}
          stepId={EnablePrebuiltRulesSteps.enablePrebuiltRules}
        />
      )}
      <LinkButton
        id={SecurityPageName.rules}
        fill
        className="step-paragraph"
        disabled={!isIntegrationsStepComplete}
        onClick={onClick}
      >
        {ADD_ELASTIC_RULES}
      </LinkButton>
    </>
  );
};

export const AddElasticRulesButton = React.memo(AddElasticRulesButtonComponent);
